# Render 部署备忘

## Build Command

```bash
pip install -r requirements.txt
```

## Start Command

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## Environment Variables

在 Render 的 Environment 页面填写：

```text
DATABASE_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
DEBUG_SQL=false
```

不要把本地 `.env` 上传到 GitHub。

## Supabase

服务首次启动时会执行 `SQLModel.metadata.create_all(engine)`，自动创建缺失的数据表。

如果以后修改已有表字段，仍然需要在 Supabase SQL Editor 里手动执行 `ALTER TABLE`。
