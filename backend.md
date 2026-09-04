# Backend API Contract — NaturaFoods CMS

> Version: `1.0.0` • Base URL: `https://api.naturaintisukses.com/api/v1` (staging: `https://staging-api-naturafoods.alvineitsolutions.com/api/v1`)  
> Current frontend state: **localStorage-only** (`nf_products`, `nf_articles`, `nf_edu`, `nf_innovation`, `nf_jobs`, `nf_official_partners`, `nf_inquiries`, `nf_admin_users`, `nf_content`, `nf_assistant_config`). All admin pages expect to be migrated to this API without UI changes.  
> Auth: **Bearer JWT** (Admin only). No public auth.

---

## 1. General Conventions

### 1.1 Headers
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer <accessToken>   // required for /admin/*
```

### 1.2 Envelope
All responses use envelope:
```json
{
  "success": true,
  "data": { /* payload */ },
  "meta": { /* pagination, etc. */ },
  "error": null
}
```
On error:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable",
    "details": { "field": "reason" },
    "requestId": "req_abc123"
  }
}
```

### 1.3 Pagination
Query: `?page=1&limit=8&q=search&sort=createdAt:desc`
Response `meta`:
```json
{
  "page": 1,
  "limit": 8,
  "total": 42,
  "totalPages": 6
}
```
Default `limit=10`, max `limit=50`. Default `sort=createdAt:desc`. Frontend `PAGE_SIZE = 8`.

### 1.4 Timestamps
`createdAt`, `updatedAt` ISO8601 `YYYY-MM-DDTHH:mm:ss.sssZ`. `deletedAt` if soft delete.

### 1.5 File URLs
Upload returns `url` (CDN/https). Frontend currently uses `data:image/*;base64` for preview; backend must accept `multipart/form-data` and return `https://cdn.../xxx.webp`. Allow external `https://images.unsplash.com/...` as passthrough.

### 1.6 Error Codes
`UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409, e.g. duplicate slug/id), `VALIDATION_ERROR` (422), `PAYLOAD_TOO_LARGE` (413, upload >5MB), `INTERNAL_ERROR` (500).

### 1.7 CORS
Allow `https://naturafoods.co.id`, `https://www.naturafoods.co.id`, `http://localhost:3000`.

---

## 2. Auth & Users

Current frontend `app/lib/auth.ts` stores `nf_admin_auth` (username) and `nf_admin_users: AdminUser[]` (`{username,password}` plain text). Seed: `admin / admin123`.

### 2.1 POST /auth/login
Login, returns JWT pair.
```http
POST /auth/login
Body: { "username": "admin", "password": "admin123" }
Resp 200: {
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 3600,
    "user": { "id": "uuid", "username": "admin", "role": "admin" }
  }
}
Err 401: { "code": "UNAUTHORIZED", "message": "Invalid credentials." }
```

### 2.2 POST /auth/refresh
```http
POST /auth/refresh
Body: { "refreshToken": "eyJ..." }
Resp 200: { "data": { "accessToken": "eyJ...", "expiresIn": 3600 } }
```

### 2.3 POST /auth/logout
Invalidate refresh token.
```http
POST /auth/logout
Header: Authorization: Bearer <accessToken>
Body: { "refreshToken": "eyJ..." }
Resp 200: { "success": true }
```

### 2.4 Users CRUD (Admin only)
Entity `AdminUser` migrated from localStorage to DB:
```ts
type AdminUser = {
  id: string;          // uuid
  username: string;    // unique, 3-32 chars, ^[a-zA-Z0-9._-]+$
  role: "admin" | "super_admin";
  createdAt: string;
  updatedAt: string;
}
```
Password: `bcrypt`, never returned.

- `GET /admin/users?page=&limit=&q=` → `data: AdminUser[]`
- `POST /admin/users` Body `{username,password}` → `201 {data: AdminUser}` Err `409 EXISTS`
- `PUT /admin/users/:id` Body `{password}` → password change (self or super_admin)
- `DELETE /admin/users/:id` → `204` Err `409 LAST_USER` / `403 SELF_DELETE`
- `GET /admin/me` → current user from token.

---

## 3. Products

File: `app/lib/data.ts:1`, `app/admin/products/page.tsx:1`, `app/products/page.tsx:1`, `app/components/HighlightedProductsSection.tsx:1`

### 3.1 Model
```ts
type ProductType = "home-brand" | "small-pack" | "general"; // default "general"
type Product = {
  id: string;         // uuid (backend) – frontend uses `slug` as PK currently; backend must support both. Recommended: keep `slug` unique as public ID.
  slug: string;       // unique, ^[a-z0-9-]+$, 3-64 chars. e.g. "belgian-dark-72"
  cat: "choco" | "matcha"; // category
  type: ProductType;  // NEW: "Home Brand" | "Small Pack" | "General"
  title: string;      // required, 2-120 chars
  note: string;       // short note, e.g. "Callets · Single origin Ecuador"
  tag: string;        // e.g. "Bulk · 2.5kg"
  img: string;        // URL (cdn or external). Upload via /uploads
  desc: string;       // description 0-1000 chars
  isHighlight: boolean; // default false → if true appears on Home landing (HighlightedProductsSection)
  isPublished?: boolean; // optional if you want draft, else delete
  createdAt: string;
  updatedAt: string;
}
```
Migration: existing 6 seeds have `type` + `isHighlight` (see `SEED_PRODUCTS`). Frontend `migrateProducts` defaults old records.

### 3.2 Endpoints

#### `GET /products`
Public. Filter/sort/search.
Query:
| param | type | notes |
|-------|------|-------|
| `q` | string | search `title, slug, cat, tag, type` (ilike) |
| `cat` | `choco|matcha|all` | optional |
| `type` | `home-brand|small-pack|general` | optional |
| `isHighlight` | `true|false` | optional – home uses `?isHighlight=true` |
| `page,limit,sort` |  | standard |

Resp 200:
```json
{
  "data": [ { "slug":"belgian-dark-72", "cat":"choco", "type":"home-brand", "title":"Belgian Dark 72%", "note":"Callets · Single origin Ecuador", "tag":"Bulk · 2.5kg", "img":"https://...", "desc":"...", "isHighlight": true, "createdAt":"..." } ],
  "meta": { "page":1, "limit":8, "total":6, "totalPages":1 }
}
```

#### `GET /products/:slug`
Public. `404 NOT_FOUND` if missing.

#### `GET /products/highlighted`
Convenience alias `GET /products?isHighlight=true` for Home landing `HighlightedProductsSection`.

#### `POST /admin/products` (Auth)
Body:
```json
{
  "slug": "belgian-dark-72",
  "cat": "choco",
  "type": "home-brand",
  "title": "Belgian Dark 72%",
  "note": "Callets · Single origin",
  "tag": "Bulk · 2.5kg",
  "img": "https://cdn.naturafoods.co.id/products/xxx.webp",
  "desc": "...",
  "isHighlight": true
}
```
Resp `201`, Err `409 CONFLICT slug exists`, `422 VALIDATION_ERROR`.

#### `PUT /admin/products/:slug`
Full update (frontend sends full object). If `slug` changes, validate uniqueness. Frontend `AdminProductsPage.save()` maps `slug` as PK.

#### `PATCH /admin/products/:slug/highlight`
Toggle highlight quickly (table button).
```
PATCH /admin/products/:slug/highlight
Body: { "isHighlight": true }
Resp 200: { "data": { "slug":"...", "isHighlight": true } }
```

#### `DELETE /admin/products/:slug` → `204`

### 3.3 Frontend Integration Notes
- `app/lib/store.ts` currently `localStorage.getItem("nf_products")`; replace with `fetch /products` (public) and `fetch /products/highlighted` for home.
- `HighlightedProductsSection` expects `isHighlight` filter; after backend, it must call `GET /products?isHighlight=true` (or `/products/highlighted`).
- Admin `FileUpload` currently `FileReader.readAsDataURL`; backend: `POST /uploads` multipart → returns `url`.

---

## 4. Articles

`Article` includes multilingual WYSIWYG (`quill`).

### 4.1 Model
```ts
type Article = {
  id: string;        // uuid backend, frontend uses slug as id
  slug: string;      // unique, e.g. "tempering-guide"
  title: string;     // required
  excerpt: string;   // 0-300
  content: string;   // deprecated fallback (EN)
  contentId: string; // ID locale HTML
  contentEn: string; // EN locale HTML
  contentZh: string; // ZH locale HTML
  date: string;      // YYYY-MM-DD
  category: string;  // e.g. "Choco", "Matcha", "Operations", "General"
  img: string;       // URL (image/video dataURL or cdn)
  isPublished?: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 4.2 Endpoints
- `GET /articles?q=&category=&page=&limit=&sort=date:desc`
- `GET /articles/:slug`
- `POST /admin/articles` Body full Article (without id). `slug, title` required.
- `PUT /admin/articles/:slug`
- `DELETE /admin/articles/:slug`
- `PATCH /admin/articles/:slug/publish` `{isPublished}` (if needed).

Frontend `app/admin/articles/page.tsx` uses `QuillEditor` with locale tabs `id|en|zh`. Backend stores HTML as-is (sanitize on write).

---

## 5. Education

`Edu` = workshop/class.
```ts
type Edu = {
  id: string;        // slug-like, e.g. "barista-matcha"
  title: string;     // required
  desc: string;
  duration: string;  // e.g. "1 day · Jakarta"
  level: string;     // e.g. "Beginner"
  img: string;       // URL (image/video)
  eyebrow: string;   // e.g. "EDUCATION · WORKSHOP"
  cta: string;       // e.g. "Watch intro"
  link: string;      // YouTube etc.
  isPublished?: boolean;
  createdAt: string;
  updatedAt: string;
}
```
- `GET /education?q=&level=&page&limit`
- `GET /education/:id`
- `POST /admin/education`
- `PUT /admin/education/:id`
- `DELETE /admin/education/:id`

---

## 6. Innovation

```ts
type Innovation = {
  id: string;
  title: string;
  desc: string;
  tag: string;       // e.g. "R&D · 2026"
  img: string;       // image/video URL
  eyebrow: string;   // e.g. "INNOVATION · R&D"
  link: string;
  cta: string;
  isPublished?: boolean;
  createdAt: string;
  updatedAt: string;
}
```
- `GET /innovations` / `GET /innovations/:id`
- `POST /admin/innovations` etc. (note frontend key `nf_innovation`)

---

## 7. Careers (Jobs)

```ts
type Job = {
  id: string;        // e.g. "sales-jkt"
  title: string;     // required
  dept: string;      // e.g. "Sales"
  loc: string;       // e.g. "Jakarta"
  type: string;      // e.g. "Full-time"
  desc: string;
  isPublished?: boolean;
  createdAt: string;
  updatedAt: string;
}
```
- `GET /jobs?q=&dept=&loc=&type=&page&limit` (public site: careers page)
- `GET /jobs/:id`
- `POST /admin/jobs`
- `PUT /admin/jobs/:id`
- `DELETE /admin/jobs/:id`

---

## 8. Inquiries (Leads)

Collected from `/contact` page (SiteContactCard). No admin create, only list/delete/export.

```ts
type Inquiry = {
  id: string;        // uuid
  name: string;      // outlet/company name
  city: string;
  whatsapp: string;  // e.g. "+6281234567890"
  interest: string;  // "Baking" | "F&B Ingredients" | "Both" (select)
  email?: string;    // optional (footer/contact)
  message?: string;
  source?: string;   // "contact_page" | "home_cta" | "chat_assistant"
  createdAt: string; // frontend currently `date: string` ISO
}
```
- `POST /inquiries` **Public** – create lead (rate-limit 5/min IP). Body `{name,city,whatsapp,interest,email?,message?}` → `201`
- `GET /admin/inquiries?q=&interest=&city=&page&limit&sort=createdAt:desc` (Auth)
- `DELETE /admin/inquiries/:id` (Auth)
- `GET /admin/inquiries/export?format=csv` → `text/csv`.

Frontend `app/lib/store.ts: inquiries: Inquiry[]` key `nf_inquiries` should be replaced by POST to `/inquiries` and GET for admin table.

---

## 9. Official Partners

`app/lib/data.ts:7`, `app/admin/official-partners/page.tsx:1`, `app/components/OfficialPartnersSection.tsx:1`

### 9.1 Model
```ts
type OfficialPartner = {
  id: string;        // unique, e.g. "bensdorp" (frontend validates uniqueness)
  name: string;      // required, e.g. "Bens Dorp"
  description: string; // short, 0-500
  image: string;     // URL: card image / brandLogo
  background: string;// URL: card background / hero
  isPublished: boolean; // default true – controls Home display
  link?: string;     // optional CTA link (default "/products")
  color?: string;    // optional hex for gradient (frontend stringToColor fallback)
  order?: number;    // optional sort order for Home grid
  createdAt: string;
  updatedAt: string;
}
```

### 9.2 Endpoints
- `GET /official-partners?isPublished=true&q=&page&limit` – public Home uses `?isPublished=true`
- `GET /official-partners/:id`
- `POST /admin/official-partners` Body `{id,name,description,image,background,isPublished}` → `201` Err `409 id exists`
- `PUT /admin/official-partners/:id` (id change validates uniqueness)
- `PATCH /admin/official-partners/:id/publish` `{isPublished:boolean}` – for table toggle
- `DELETE /admin/official-partners/:id` → `204`
- `PATCH /admin/official-partners/reorder` Body `{ids: string[]}` – optional if drag reorder added.

Frontend mapping: `OfficialPartnersSection` maps `image→brandLogo`, `background→mainImage`, `color=stringToColor(id)`.

---

## 10. Site Content (i18n Overrides)

`app/lib/siteContent.ts` stores `nf_content: Record<Locale, Record<string, unknown>>` with `deepMerge` against `dict` in `app/i18n.tsx`. Admin `app/admin/content/page.tsx` edits per group (`home|nav|about|aboutDetail|products|articles|education|innovation|contact|careers`).

### 10.1 Model
```ts
type Locale = "id" | "en" | "zh";
type SiteContent = {
  locale: Locale;
  overrides: Record<string, unknown>; // deep partial of Dict, e.g. { heroTitle1: "Baking", aboutBullets: ["..."] }
  updatedAt: string;
}
```
Store as JSON blob per locale (Postgres `jsonb`).

### 10.2 Endpoints
- `GET /site-content` → `Record<Locale, Record<string, unknown>>` (all locales) – used on app bootstrap to `deepMerge(dict[locale], overrides)`. Public, cached.
- `GET /site-content/:locale` → overrides for locale
- `PUT /admin/site-content/:locale` (Auth) Body `Record<string, unknown>` (full overrides for locale) – frontend `saveRaw(draft)` sends `draft[locale]`. Upsert.
- `DELETE /admin/site-content` (Auth) → clear all overrides (`clearOverrides()`).
- `DELETE /admin/site-content/:locale` → clear locale.
- Optional `PATCH /admin/site-content/:locale` Body `{path: string[], value: unknown}` for single key update.

Event: backend should emit `nf_content_updated` equivalent via polling or `GET /site-content` ETag.

---

## 11. AI Assistant Config

`app/lib/assistant.ts:28`, `app/admin/assistant/page.tsx:1`

### 11.1 Model
```ts
type LocaleCopy = { title:string; sub:string; placeholder:string; send:string; quick:string[]; greet:string; fallback:string; wa:string; contact:string; }
type KnowledgeEntry = { id:string; keywords:string[]; reply: Record<Locale,string>; }
type AssistantTuning = { tone:"friendly"|"professional"|"concise"; length:"short"|"medium"|"detailed"; strict:boolean; }
type AssistantConfig = {
  id: string; // singleton "default"
  waLink: string; // https://wa.me/...
  persona: string; // system prompt
  tuning: AssistantTuning;
  copy: Record<Locale, LocaleCopy>;
  knowledge: KnowledgeEntry[];
  updatedAt: string;
}
```

### 11.2 Endpoints
- `GET /assistant/config` – public (for ChatAssistant widget) + admin. Cache 5min.
- `PUT /admin/assistant/config` (Auth) Body `AssistantConfig` (without id/updatedAt) → upsert singleton. Frontend `useAssistantConfig` `saveAssistantConfig` should PUT.
- `POST /admin/assistant/config/reset` → reset to `DEFAULT_ASSISTANT`.

Frontend `resolveReply(cfg,q,locale)` is client-only now; after backend, keep same logic but `cfg` from `GET /assistant/config`. Future LLM proxy can reuse `persona+tuning`.

Optional chat proxy:
- `POST /assistant/chat` Body `{message:string, locale:Locale}` → `{reply:string, matchedEntryId?:string}` (wraps `resolveReply` server-side for tuning).

---

## 12. Uploads

Frontend `FileUpload` (`app/admin/_components.tsx:67`) currently `FileReader.readAsDataURL`. Backend replaces withcdn URL.

- `POST /admin/uploads` (Auth) `Content-Type: multipart/form-data` Field `file: binary`, optional `folder: "products"|"partners"|"articles"|...`
  - Max 5MB image, 20MB video (`accept: image/*,video/*` where needed).
  - Resp `201: { data: { url: "https://cdn.naturafoods.co.id/uploads/products/xxx.webp", originalName, size, mime } }`
  - Process: image → webp 1600px max, video → mp4/hls.
  - Allow `DELETE /admin/uploads` with `url` for orphan cleanup.

- Alternatively accept `POST /admin/uploads/base64` Body `{dataUrl:string, folder?}` for backward compat with `data:` previews.

Frontend should swap `onChange(String(reader.result))` to `uploadFile(file).then(url=>onChange(url))`.

Add to `next.config.ts:8` `remotePatterns` for `cdn.naturafoods.co.id`.

---

## 13. Dashboard / Stats

`app/admin/dashboard/page.tsx:1` shows counts from `useStore()`.

- `GET /admin/stats` (Auth) →
```json
{
  "data": {
    "products": 12,
    "productsHighlighted": 4,
    "officialPartners": 7,
    "officialPartnersPublished": 5,
    "articles": 8,
    "education": 3,
    "innovation": 3,
    "jobs": 3,
    "inquiries": 27,
    "users": 2
  }
}
```
Used for `AdminShell` counts array order: `[products, officialPartners, articles, edu, innovation, jobs, inquiries, users, assistantEntries, contentOverrides]` – currently frontend hardcodes `counts = [products.length, officialPartners.length, articles.length, edu.length, innovation.length, jobs.length, inquiries.length, 0,0,0]` – backend stats should match this order.

---

## 14. OpenAPI Summary

Proposed `openapi.yaml` top-level paths:

```yaml
openapi: 3.1.0
servers:
  - url: https://api.naturafoods.co.id/api/v1
paths:
  /auth/login: {post: {...}}
  /auth/refresh: {post: {...}}
  /auth/logout: {post: {...}}
  /admin/users: {get: {}, post: {}}
  /admin/users/{id}: {put: {}, delete: {}}
  /admin/me: {get: {}}
  /products: {get: {}}
  /products/{slug}: {get: {}}
  /products/highlighted: {get: {}}
  /admin/products: {post: {}}
  /admin/products/{slug}: {put: {}, delete: {}}
  /admin/products/{slug}/highlight: {patch: {}}
  /articles: {get: {}}
  /articles/{slug}: {get: {}}
  /admin/articles: {post: {}}
  /admin/articles/{slug}: {put: {}, delete: {}}
  /education: {get: {}}
  /admin/education: {post: {}}
  /admin/education/{id}: {put: {}, delete: {}}
  /innovations: {get: {}}
  /admin/innovations: {post: {}}
  /admin/innovations/{id}: {put: {}, delete: {}}
  /jobs: {get: {}}
  /jobs/{id}: {get: {}}
  /admin/jobs: {post: {}}
  /admin/jobs/{id}: {put: {}, delete: {}}
  /inquiries: {post: {}}
  /admin/inquiries: {get: {}}
  /admin/inquiries/{id}: {delete: {}}
  /admin/inquiries/export: {get: {}}
  /official-partners: {get: {}}
  /official-partners/{id}: {get: {}}
  /admin/official-partners: {post: {}}
  /admin/official-partners/{id}: {put: {}, delete: {}}
  /admin/official-partners/{id}/publish: {patch: {}}
  /site-content: {get: {}}
  /site-content/{locale}: {get: {}}
  /admin/site-content/{locale}: {put: {}, delete: {}}
  /admin/site-content: {delete: {}}
  /assistant/config: {get: {}}
  /admin/assistant/config: {put: {}}
  /admin/assistant/config/reset: {post: {}}
  /assistant/chat: {post: {}}
  /admin/uploads: {post: {}}
  /admin/stats: {get: {}}
```

---

## 15. DB Suggestion (Prisma)

```prisma
model Product {
  id          String   @id @default(uuid())
  slug        String   @unique
  cat         String   // "choco" | "matcha"
  type        String   @default("general") // "home-brand" | "small-pack" | "general"
  title       String
  note        String?
  tag         String?
  img         String
  desc        String?  @db.Text
  isHighlight Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([isHighlight])
  @@index([type])
}

model OfficialPartner {
  id          String   @id // allow custom id like "bensdorp"
  name        String
  description String?  @db.Text
  image       String
  background  String
  isPublished Boolean  @default(true)
  order       Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Article {
  id        String @id @default(uuid())
  slug      String @unique
  title     String
  excerpt   String? @db.Text
  content   String? @db.Text
  contentId String? @db.Text
  contentEn String? @db.Text
  contentZh String? @db.Text
  date      DateTime
  category  String
  img       String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Inquiry {
  id        String @id @default(uuid())
  name      String
  city      String
  whatsapp  String
  interest  String
  email     String?
  message   String? @db.Text
  source    String?
  createdAt DateTime @default(now())
}

model SiteContent {
  locale    String @id // "id" | "en" | "zh"
  overrides Json   // Record<string, unknown>
  updatedAt DateTime @updatedAt
}

model AssistantConfig {
  id        String @id @default("default")
  waLink    String
  persona   String @db.Text
  tuning    Json
  copy      Json
  knowledge Json
  updatedAt DateTime @updatedAt
}

model User {
  id        String @id @default(uuid())
  username  String @unique
  password  String // bcrypt
  role      String @default("admin")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 16. Migration Path

1. Backend implements above endpoints (priority: `auth`, `products` with `type/isHighlight`, `official-partners`, `uploads`).
2. Frontend swaps `useStore` `load(KEYS.*)` → `fetch`:
   ```ts
   // example: app/lib/store.ts
   useEffect(()=>{
     fetch('/api/v1/products?limit=100').then(r=>r.json()).then(j=>setProducts(j.data))
     fetch('/api/v1/official-partners?isPublished=true').then(...)
   },[])
   ```
   Keep `localStorage` fallback for offline dev.
3. `app/admin/_components.tsx: FileUpload` → call `POST /admin/uploads`.
4. `GET /products/highlighted` powers `HighlightedProductsSection`; ensure `next.config.ts` allows CDN host.
5. Remove demo plain-text passwords; `auth.ts` `login()` → `POST /auth/login`.

---

## 17. Example cURL

```bash
# login
curl -X POST https://api.naturafoods.co.id/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# create product (highlighted home-brand)
curl -X POST https://api.naturafoods.co.id/api/v1/admin/products \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{
    "slug":"belgian-dark-72",
    "cat":"choco",
    "type":"home-brand",
    "title":"Belgian Dark 72%",
    "note":"Callets · Single origin Ecuador",
    "tag":"Bulk · 2.5kg",
    "img":"https://cdn.naturafoods.co.id/products/belgian.webp",
    "desc":"Single-origin Ecuador...",
    "isHighlight": true
  }'

# get highlighted for home
curl https://api.naturafoods.co.id/api/v1/products?isHighlight=true

# toggle partner publish
curl -X PATCH https://api.naturafoods.co.id/api/v1/admin/official-partners/bensdorp/publish \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"isPublished": false}'

# upload
curl -X POST https://api.naturafoods.co.id/api/v1/admin/uploads \
  -H "Authorization: Bearer <token>" -F "file=@./bensdorp.png" -F "folder=partners"
```

