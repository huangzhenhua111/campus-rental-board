from pydantic import BaseModel
from sqlmodel import SQLModel, Field

class ListingCreate(BaseModel):
    title: str = Field(description="房源标题")
    location: str = Field(description="大致位置，比如学校东门、山大宿舍附近")
    address: str = Field(description="详细地址或小区名")
    price: int = Field(description="月租价格")
    rental_type: str = Field(description="房源类型，比如单间、合租、整租、转租")
    available_from: str = Field(description="可入住时间")
    lease_term: str = Field(description="租期")
    description: str = Field(description="房源描述")
    requirements: str = Field(description="租客要求")
    contact_name: str = Field(description="联系人姓名")
    contact_method: str = Field(description="联系方式")
    image_urls: list[str] = Field(default_factory=list, description="房源图片链接")


class ListingResponse(ListingCreate):
    id: int
    status: str

class ListingCreateResponse(ListingResponse):
    owner_token:str
    manage_url:str

class Listing(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    title: str
    location: str
    address: str
    price: int
    rental_type: str
    available_from: str
    lease_term: str
    description: str
    requirements: str
    contact_name: str
    contact_method: str
    image_urls: str = ""
    status: str = "pending"
    owner_token:str=""


class RentalRequestCreate(BaseModel):
    description: str = Field(description="求租描述")
    contact_method: str = Field(description="联系方式")
    location: str = Field(default="", description="期望地点")
    budget: int = Field(default=0, description="期望价位")
    requirements: str = Field(default="", description="特殊要求")


class RentalRequestResponse(RentalRequestCreate):
    id: int
    status: str


class RentalRequestCreateResponse(RentalRequestResponse):
    owner_token: str
    manage_url: str


class RentalRequest(SQLModel, table=True):
    __tablename__ = "rental_request"

    id: int | None = Field(default=None, primary_key=True)
    description: str
    contact_method: str
    location: str = ""
    budget: int = 0
    requirements: str = ""
    status: str = "published"
    owner_token: str = ""
