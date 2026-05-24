import os
from uuid import uuid4
from supabase import create_client

from typing import Annotated
from fastapi import FastAPI, HTTPException,Depends,File, UploadFile,Form, Request
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from app.schemas import (
    ListingCreate,
    ListingResponse,
    Listing,
    ListingCreateResponse,
    RentalRequest,
    RentalRequestCreate,
    RentalRequestResponse,
    RentalRequestCreateResponse,
)
from sqlmodel import Session,select
from app.database import create_db_and_tables, get_session
from starlette.middleware.sessions import SessionMiddleware

from dotenv import load_dotenv

load_dotenv()

app=FastAPI(
    title="Rental Agent Demo",
    description="A campus rental listing website with future agent features.",
    version="0.1.0"
)

admin_session_secret=os.getenv("ADMIN_SESSION_SECRET")
if admin_session_secret is None:
    raise RuntimeError("ADMIN_SESSION_SECRET is not set")
app.add_middleware(SessionMiddleware,secret_key=admin_session_secret)

supabase_url = os.getenv("SUPABASE_URL")
supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase_storage_bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "listing-images")

if supabase_url is None:
    raise RuntimeError("SUPABASE_URL is not set")

if supabase_service_role_key is None:
    raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is not set")

supabase = create_client(supabase_url, supabase_service_role_key)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

app.mount("/static",StaticFiles(directory="app/static"),name="static")

def require_admin(request:Request):
    if not request.session.get("is_admin"):
        raise HTTPException(status_code=401,detail="Admin login required")

def find_listing(session:Session,listing_id:int):
    return session.get(Listing,listing_id)

def require_listing_owner(session:Session,listing_id:int,token:str):
    listing=find_listing(session,listing_id)
    if listing is None:
        raise HTTPException(status_code=404,detail="Listing not found")
    if not listing.owner_token or listing.owner_token!=token:
        raise HTTPException(status_code=403,detail="Invalid owner token")
    return listing

def find_rental_request(session:Session,request_id:int):
    return session.get(RentalRequest,request_id)

def require_rental_request_owner(session:Session,request_id:int,token:str):
    rental_request=find_rental_request(session,request_id)
    if rental_request is None:
        raise HTTPException(status_code=404,detail="Rental request not found")
    if not rental_request.owner_token or rental_request.owner_token!=token:
        raise HTTPException(status_code=403,detail="Invalid owner token")
    return rental_request

def listing_to_response(listing: Listing) -> ListingResponse:
    image_urls = []

    if listing.image_urls:
        image_urls = [
            url.strip()
            for url in listing.image_urls.split(",")
            if url.strip()
        ]

    return ListingResponse(
        id=listing.id,
        title=listing.title,
        source=listing.source,
        location=listing.location,
        address=listing.address,
        price=listing.price,
        rental_type=listing.rental_type,
        available_from=listing.available_from,
        lease_term=listing.lease_term,
        description=listing.description,
        requirements=listing.requirements,
        contact_name=listing.contact_name,
        contact_method=listing.contact_method,
        image_urls=image_urls,
        status=listing.status,
    )

def rental_request_to_response(rental_request:RentalRequest)->RentalRequestResponse:
    return RentalRequestResponse(
        id=rental_request.id,
        description=rental_request.description,
        contact_method=rental_request.contact_method,
        location=rental_request.location,
        budget=rental_request.budget,
        requirements=rental_request.requirements,
        status=rental_request.status,
    )

@app.get("/")
def root():
    return FileResponse("app/static/index.html")

@app.get("/admin")
def admin_page(request:Request):
    if not request.session.get("is_admin"):
        return RedirectResponse("/admin-login",status=303)
    return FileResponse("app/static/admin.html")

@app.get("/admin-login")
def admin_login_page():
    return FileResponse("app/static/admin_login.html")

@app.get("/listing")
def listing_page():
    return FileResponse("app/static/listing.html")

@app.get("/post")
def post_page():
    return FileResponse("app/static/post.html")

@app.get("/manage-listing")
def manage_listing_page():
    return FileResponse("app/static/manage_listing.html")

@app.get("/post-request")
def post_request_page():
    return FileResponse("app/static/post_request.html")

@app.get("/manage-request")
def manage_request_page():
    return FileResponse("app/static/manage_request.html")

@app.get("/api/health")
def health():
    return {
        "status":"ok"
    }

@app.post("/api/admin/login")
def admin_login(request:Request,password:str=Form(...)):
    admin_password=os.getenv("ADMIN_PASSWORD")
    if admin_password is None:
        raise RuntimeError("ADMIN_PASSWORD is not set")
    if password!=admin_password:
        raise HTTPException(status_code=401,detail="密码错误")
    request.session["is_admin"]=True
    return {"ok":True}

@app.post("/api/admin/logout")
def admin_logout(request:Request):
    request.session.clear()
    return {"ok":True}

@app.post("/api/listings", response_model=ListingCreateResponse)
def create_listing(
    request:Request,
    listing: ListingCreate,
    session: Session = Depends(get_session),
):
    owner_token=uuid4().hex
    db_listing = Listing(
        title=listing.title,
        source=listing.source,
        location=listing.location,
        address=listing.address,
        price=listing.price,
        rental_type=listing.rental_type,
        available_from=listing.available_from,
        lease_term=listing.lease_term,
        description=listing.description,
        requirements=listing.requirements,
        contact_name=listing.contact_name,
        contact_method=listing.contact_method,
        image_urls=",".join(listing.image_urls),
        status="published",
        owner_token=owner_token
    )

    session.add(db_listing)
    session.commit()
    session.refresh(db_listing)

    response=listing_to_response(db_listing)
    manage_url=str(request.base_url).rstrip("/")+f"/manage-listing?id={db_listing.id}&token={owner_token}"
    return ListingCreateResponse(
        **response.model_dump(),
        owner_token=owner_token,
        manage_url=manage_url
    )

@app.get("/api/listings",response_model=list[ListingResponse])
def get_listings(    
    location: str | None = None,
    max_price: int | None = None,
    rental_type: str | None = None,
    source: str | None = None,
    keyword: str | None = None,
    session: Session = Depends(get_session),
):
    statement=select(Listing).where(Listing.status=="published")
    if location:
        statement=statement.where(
            Listing.location.contains(location)
            | Listing.title.contains(location)
            | Listing.address.contains(location)
            | Listing.description.contains(location)
        )
    if max_price is not None:
        statement=statement.where(Listing.price<=max_price)
    if rental_type:
        statement=statement.where(Listing.rental_type==rental_type)
    if source:
        statement=statement.where(Listing.source==source)
    if keyword:
        statement=statement.where(
            Listing.title.contains(keyword)
            | Listing.description.contains(keyword)
            | Listing.address.contains(keyword)
        )
    results=session.exec(statement).all()
    return [listing_to_response(listing) for listing in results]

@app.get("/api/admin/listings",response_model=list[ListingResponse])
def get_admin_listings(request:Request,session:Session=Depends(get_session)):
    require_admin(request)
    statement=select(Listing)
    results=session.exec(statement).all()
    return [listing_to_response(listing) for listing in results]

@app.post("/api/admin/listings/{listing_id}/approve",response_model=ListingResponse)
def approve_listing(request:Request,listing_id:int,session:Session=Depends(get_session)):
    require_admin(request)
    listing=find_listing(session,listing_id)
    if listing is None:
        raise HTTPException(status_code=404,detail="Listing not found")
    listing.status="published"
    session.add(listing)
    session.commit()
    session.refresh(listing)
    return listing_to_response(listing)

@app.post("/api/admin/listings/{listing_id}/remove",response_model=ListingResponse)
def remove_listing(request:Request,listing_id:int,session:Session=Depends(get_session)):
    require_admin(request)
    listing=find_listing(session,listing_id)
    if listing is None:
        raise HTTPException(status_code=404,detail="Listing not found")
    listing.status="removed"
    session.add(listing)
    session.commit()
    session.refresh(listing)
    return listing_to_response(listing)

@app.get("/api/listings/{listing_id}",response_model=ListingResponse)
def get_listing_detail(listing_id:int,session:Session=Depends(get_session)):
    listing=find_listing(session,listing_id)
    if listing is None:
        raise HTTPException(status_code=404,detail="Listing not found")
    if listing.status!="published":
        raise HTTPException(status_code=404,detail="Listing not published")
    return listing_to_response(listing)

@app.get("/api/listings/{listing_id}/owner",response_model=ListingResponse)
def get_owner_listing(listing_id:int,token:str,session:Session=Depends(get_session)):
    listing=require_listing_owner(session,listing_id,token)
    return listing_to_response(listing)

@app.post("/api/listings/{listing_id}/owner/remove",response_model=ListingResponse)
def owner_remove_listing(listing_id:int,token:str,session:Session=Depends(get_session)):
    listing=require_listing_owner(session,listing_id,token)
    listing.status="removed"
    session.add(listing)
    session.commit()
    session.refresh(listing)
    return listing_to_response(listing)

@app.post("/api/rental-requests", response_model=RentalRequestCreateResponse)
def create_rental_request(
    request:Request,
    rental_request:RentalRequestCreate,
    session:Session=Depends(get_session),
):
    owner_token=uuid4().hex
    db_request=RentalRequest(
        description=rental_request.description,
        contact_method=rental_request.contact_method,
        location=rental_request.location,
        budget=rental_request.budget,
        requirements=rental_request.requirements,
        status="published",
        owner_token=owner_token,
    )
    session.add(db_request)
    session.commit()
    session.refresh(db_request)

    response=rental_request_to_response(db_request)
    manage_url=str(request.base_url).rstrip("/")+f"/manage-request?id={db_request.id}&token={owner_token}"
    return RentalRequestCreateResponse(
        **response.model_dump(),
        owner_token=owner_token,
        manage_url=manage_url,
    )

@app.get("/api/rental-requests",response_model=list[RentalRequestResponse])
def get_rental_requests(
    location:str|None=None,
    max_price:int|None=None,
    keyword:str|None=None,
    session:Session=Depends(get_session),
):
    statement=select(RentalRequest).where(RentalRequest.status=="published")
    if location:
        statement=statement.where(
            RentalRequest.location.contains(location)
            | RentalRequest.description.contains(location)
        )
    if max_price is not None:
        statement=statement.where(
            (RentalRequest.budget==0)
            | (RentalRequest.budget<=max_price)
        )
    if keyword:
        statement=statement.where(
            RentalRequest.description.contains(keyword)
            | RentalRequest.requirements.contains(keyword)
        )
    results=session.exec(statement).all()
    return [rental_request_to_response(rental_request) for rental_request in results]

@app.get("/api/rental-requests/{request_id}/owner",response_model=RentalRequestResponse)
def get_owner_rental_request(request_id:int,token:str,session:Session=Depends(get_session)):
    rental_request=require_rental_request_owner(session,request_id,token)
    return rental_request_to_response(rental_request)

@app.post("/api/rental-requests/{request_id}/owner/remove",response_model=RentalRequestResponse)
def owner_remove_rental_request(request_id:int,token:str,session:Session=Depends(get_session)):
    rental_request=require_rental_request_owner(session,request_id,token)
    rental_request.status="removed"
    session.add(rental_request)
    session.commit()
    session.refresh(rental_request)
    return rental_request_to_response(rental_request)

@app.post("/api/uploads/images")
async def upload_images(files:Annotated[list[UploadFile],File(description="房源图片")]):
    if len(files)>6:
        raise HTTPException(status_code=400,detail="最多上传6张图片")
    image_urls=[]
    for file in files:
        if file.content_type is None or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400,detail="只能上传图片文件")
        content=await file.read()
        # max_size=8*1024*1024
        # if len(content)>max_size:
        #     raise HTTPException(status_code=400,detail="单张图片不能超过8MB")
        file_extension="jpg"
        if file.filename and "." in file.filename:
            file_extension=file.filename.rsplit(".",1)[1].lower()
        file_path=f"listings/{uuid4()}.{file_extension}"
        supabase.storage.from_(supabase_storage_bucket).upload(
            file_path,
            content,
            {
                "content-type":file.content_type,
                "upsert":"false",
            }
        )
        public_url=supabase.storage.from_(supabase_storage_bucket).get_public_url(file_path)
        image_urls.append(public_url)
    return {"urls":image_urls}
