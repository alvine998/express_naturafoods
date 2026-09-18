# Frontend Migration Guide — NaturaFoods CMS (API Contract v1.0.0)

Base URL: `http://localhost:4000/api/v1` (staging: `https://staging-api-naturafoods.alvineitsolutions.com/api/v1`, prod: `https://api.naturafoods.co.id/api/v1`)

This doc explains how to migrate frontend from `localStorage-only` (`nf_products`, `nf_articles`, etc.) to the new API contract defined in `backend.md`.

## 1. General Client

Create `lib/api.ts` (Next.js):

```ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

type Envelope<T> = { success: boolean; data: T; meta: {page,limit,total,totalPages}|null; error: {code,message,details,requestId}|null };

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<Envelope<T>> {
  const token = typeof window !== "undefined" ? localStorage.getItem("nf_access_token") : null;
  const headers: Record<string,string> = { "Content-Type": "application/json", ...(opts.headers as any) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const json = await res.json();
  if (!res.ok && !json.error) throw new Error(json.message || "Request failed");
  // handle 401 refresh
  if (res.status === 401 && path !== "/auth/refresh") {
    const refreshToken = localStorage.getItem("nf_refresh_token");
    if (refreshToken) {
      const r = await fetch(`${API_BASE}/auth/refresh`, { method:"POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({refreshToken}) });
      const j = await r.json();
      if (j.success) {
        localStorage.setItem("nf_access_token", j.data.accessToken);
        return apiFetch(path, opts); // retry
      }
    }
  }
  return json;
}
```

Pagination helper matches `backend.md:1.3`:

```ts
function buildQuery(params: Record<string,any>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k,v]) => { if (v!==undefined && v!==null && v!=="") q.set(k, String(v)); });
  return q.toString() ? `?${q}` : "";
}
```

## 2. Auth (Admin)

Replace `app/lib/auth.ts` localStorage `nf_admin_auth` / `nf_admin_users` plain text.

```ts
// login
const { data } = await apiFetch<{accessToken:string, refreshToken:string, expiresIn:number, user:{id,username,role}}>(
  "/auth/login",
  { method:"POST", body: JSON.stringify({username, password}) }
);
localStorage.setItem("nf_access_token", data.accessToken);
localStorage.setItem("nf_refresh_token", data.refreshToken);
localStorage.setItem("nf_user", JSON.stringify(data.user));

// me
const me = await apiFetch("/admin/me");

// users CRUD (admin)
await apiFetch("/admin/users?page=1&limit=10&q=search");
await apiFetch("/admin/users", { method:"POST", body: JSON.stringify({username,password}) });
await apiFetch(`/admin/users/${id}`, { method:"PUT", body: JSON.stringify({password:"new"}) });
await apiFetch(`/admin/users/${id}`, { method:"DELETE" });

// logout
await fetch(`${API_BASE}/auth/logout`, { method:"POST", headers: {Authorization:`Bearer ${token}`}, body: JSON.stringify({refreshToken}) });
localStorage.clear();
```

Seed from `backend.md`: `admin / admin123` (now stored bcrypt in DB, not plain text). Username is lowercased, 3-32 chars `^[a-zA-Z0-9._-]+$`.

## 3. Products

Replace `app/lib/store.ts` `localStorage.getItem("nf_products")` and `app/lib/data.ts`.

```ts
// public list with filters
const q = buildQuery({ q:search, cat, type, isHighlight, page, limit:8, sort:"createdAt:desc" });
const { data, meta } = await apiFetch<Product[]>(`/products${q}`);

// highlighted for Home
const { data: highlighted } = await apiFetch<Product[]>("/products?isHighlight=true&limit=8");
// or convenience alias same result
const { data: highlighted2 } = await apiFetch<Product[]>("/products/highlighted");

// detail
const { data: product } = await apiFetch<Product>(`/products/${slug}`);

// admin
await apiFetch("/admin/products", { method:"POST", body: JSON.stringify({slug,categoryId,brandId,type,title,note,tag,img,file,desc,isHighlight}) });
await apiFetch(`/admin/products/${slug}`, { method:"PUT", body: JSON.stringify({...product}) });
await apiFetch(`/admin/products/${slug}/highlight`, { method:"PATCH", body: JSON.stringify({isHighlight:true}) });
await apiFetch(`/admin/products/${slug}`, { method:"DELETE" });
```

Model `Product` matches `backend.md:3.1` with `isHighlight` for `HighlightedProductsSection`. Keep `PAGE_SIZE = 8`.

`brandId` is optional (nullable). Products return `brandId` plus an embedded `brand: {id,slug,name}`; filter with `/products?brandId=<uuid>`, or comma-separate for several brands: `/products?brandId=<uuid1>,<uuid2>`. Setting `brandId: null` on PUT clears the brand.

### Brands (master data)

```ts
// public
const { data: brands, meta } = await apiFetch<Brand[]>("/brands?isActive=true&q=&page=1&limit=10");
const { data: brand } = await apiFetch<Brand>(`/brands/${slug}`);

// admin
await apiFetch("/admin/brands", { method:"POST", body: JSON.stringify({slug,name,description,logo,isActive:true}) });
await apiFetch(`/admin/brands/${slug}`, { method:"PUT", body: JSON.stringify({name,description,logo}) });
await apiFetch(`/admin/brands/${slug}/active`, { method:"PATCH", body: JSON.stringify({isActive:false}) });
await apiFetch(`/admin/brands/${slug}`, { method:"DELETE" });
```

Deleting a brand clears `brandId` on its products (`ON DELETE SET NULL`).

## 4. Official Partners

```ts
// public Home uses ?isPublished=true
const { data } = await apiFetch<OfficialPartner[]>("/official-partners?isPublished=true&q=&page=1&limit=10");

// mapping for OfficialPartnersSection
const mapped = data.map(p => ({ brandLogo: p.images[0], brandImages: p.images, mainImage: p.background, color: p.color || stringToColor(p.id) }));

// admin
await apiFetch("/admin/official-partners", { method:"POST", body: JSON.stringify({id,name,description,images,background,isPublished}) });
await apiFetch(`/admin/official-partners/${id}`, { method:"PUT", body: JSON.stringify({...}) });
await apiFetch(`/admin/official-partners/${id}/publish`, { method:"PATCH", body: JSON.stringify({isPublished:false}) });
await apiFetch(`/admin/official-partners/reorder`, { method:"PATCH", body: JSON.stringify({ids: orderedIds}) });
await apiFetch(`/admin/official-partners/${id}`, { method:"DELETE" });
```

## 5. Articles

`Article` includes multilingual WYSIWYG. Backend stores HTML as-is.

```ts
const { data, meta } = await apiFetch<Article[]>(`/articles?q=&category=&page=1&limit=10&sort=date:desc`);
const { data: article } = await apiFetch<Article>(`/articles/${slug}`);
await apiFetch("/admin/articles", { method:"POST", body: JSON.stringify({slug,title: "Tempering Guide", category, excerpt, thumbnail: img, contentID:"<p>ID</p>", contentEN:"<p>EN</p>", contentZN:"<p>ZH</p>", status:"published"}) });
await apiFetch(`/admin/articles/${slug}`, { method:"PUT", body: JSON.stringify({...}) });
await apiFetch(`/admin/articles/${slug}`, { method:"DELETE" });
```

The API returns both legacy and contract shapes for compatibility:
`{ slug, title, titleEN, titleID, titleZN, contentEN/contentEn, img/thumbnail, date/published_date, isPublished/status, ... }`

## 6. Education / Innovation / Jobs

```ts
// Education
await apiFetch("/education?q=&level=&page=&limit=10");
await apiFetch("/education/barista-matcha");

// Admin
await apiFetch("/admin/education", { method:"POST", body: JSON.stringify({id,title,desc,duration,level,img,eyebrow,cta,link}) });

// Innovation
await apiFetch("/innovations");
await apiFetch("/admin/innovations", { method:"POST", body: JSON.stringify({id,title,desc,tag,img,eyebrow,link,cta}) });

// Jobs
await apiFetch("/jobs?q=&dept=&loc=&type=&page=&limit=10");
await apiFetch("/jobs/sales-jkt");

// Admin similar PUT/DELETE at /admin/jobs/${id}
```

## 7. Inquiries (Leads)

Contact page `POST /inquiries` public, rate-limited 5/min IP.

```ts
await fetch(`${API_BASE}/inquiries`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({name,city,whatsapp,interest,email,message,source:"contact_page"}) });

// Admin
const { data } = await apiFetch<Inquiry[]>("/admin/inquiries?q=&interest=&city=&page=1&limit=10&sort=createdAt:desc");
await apiFetch(`/admin/inquiries/${id}`, { method:"DELETE" });
// CSV export
window.location.href = `${API_BASE}/admin/inquiries/export?format=csv`; // with Authorization header via fetch blob
```

## 8. Site Content (i18n Overrides)

Replace `app/lib/siteContent.ts` `nf_content` + `deepMerge`.

```ts
// bootstrap
const { data } = await apiFetch<Record<Locale, Record<string,unknown>>>("/site-content");
const merged = deepMerge(dict[locale], data[locale] || {});

// per locale
const { data: overrides } = await apiFetch(`/site-content/${locale}`);

// admin save
await apiFetch(`/admin/site-content/${locale}`, { method:"PUT", body: JSON.stringify(draft[locale]) });
await apiFetch("/admin/site-content", { method:"DELETE" });
```

## 9. Assistant Config

```ts
const { data: cfg } = await apiFetch<AssistantConfig>("/assistant/config"); // public cache 5min
await apiFetch("/admin/assistant/config", { method:"PUT", body: JSON.stringify(cfg) });
await apiFetch("/admin/assistant/config/reset", { method:"POST" });

// optional server-side chat proxy
const { data: {reply} } = await apiFetch("/assistant/chat", { method:"POST", body: JSON.stringify({message, locale}) });
```

Keep client-side `resolveReply(cfg,q,locale)` logic; now `cfg` comes from API.

## 10. Uploads — Cloudflare R2

Backend now stores uploads at **Cloudflare R2** (S3-compatible) via `src/config/r2.js:1` and `src/routes/uploads.js:1`. Images are auto-converted to `webp` 1600px max with `sharp` if installed (optional), otherwise stored as-is. Videos kept as-is (20MB max).

**Env required for R2** (see `.env.example:14`):
```
R2_ACCOUNT_ID=<cloudflare account id>
R2_ACCESS_KEY_ID=<r2 token access key>
R2_SECRET_ACCESS_KEY=<r2 token secret>
R2_BUCKET=naturafoods
R2_PUBLIC_URL=https://cdn.naturafoods.co.id
# optional R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
# FRONTEND: NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```
If `R2_*` not set, server falls back to local disk `./uploads` and returns `http://localhost:4000/uploads/<folder>/xxx.webp` (useful for local dev). When R2 is configured, all uploads return `https://cdn.naturafoods.co.id/<folder>/xxx.webp`.

Setup:
1. Cloudflare Dashboard → R2 → Create bucket `naturafoods`, set **Public Access** via custom domain `cdn.naturafoods.co.id` (or use `*.r2.dev`).
2. R2 → Manage R2 API Tokens → Create token with **Object Read & Write** on bucket `naturafoods`.
3. Set `R2_ACCOUNT_ID` (from dashboard URL), `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` in `.env`.
4. (Optional) `npm i sharp` for automatic webp conversion (1600px, quality 85). Without sharp, images are uploaded unchanged.
5. Restart `npm run dev` — logs `[R2] Configured bucket=...` or `[R2] Not configured — falling back`.

Replace `FileUpload` `FileReader.readAsDataURL` (`app/admin/_components.tsx:67`):

```ts
async function uploadFile(file: File, folder: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder); // "products"|"partners"|"articles"|...
  const res = await fetch(`${API_BASE}/admin/uploads`, { method:"POST", headers:{Authorization:`Bearer ${token}`}, body: form });
  const json = await res.json();
  if (!json.success) throw new Error(json.error.message);
  return json.data.url; // R2: https://cdn.naturafoods.co.id/products/xxx.webp | Local: http://localhost:4000/uploads/products/xxx.webp
  // then onChange(url)
}
// base64 fallback (for pasted data URLs)
await apiFetch("/admin/uploads/base64", { method:"POST", body: JSON.stringify({dataUrl, folder}) });
// delete orphan
await apiFetch("/admin/uploads", { method:"DELETE", body: JSON.stringify({url}) });
// or {key: "products/xxx.webp"}
```

Limits: image 10MB (`PAYLOAD_TOO_LARGE`), video 20MB. `DELETE /admin/uploads` accepts either `url` or `key`. Add `remotePatterns` in `next.config.ts:8` for `cdn.naturafoods.co.id` and `localhost`:
```ts
images: { remotePatterns: [{ protocol:"https", hostname:"cdn.naturafoods.co.id" }, {protocol:"https", hostname:"images.unsplash.com"}] }
```
`backend.md:1.5` passthrough for `https://images.unsplash.com/...` still allowed.

## 11. Stats

```ts
const { data } = await apiFetch("/admin/stats");
// data: { products, productsHighlighted, officialPartners, officialPartnersPublished, articles, education, innovation, jobs, inquiries, users, counts:[...] }
const counts = data.counts; // order: [products, officialPartners, articles, edu, innovation, jobs, inquiries, users, assistantEntries, contentOverrides]
```

## 12. Envelope & Error Handling

All `/api/v1` responses use:

```json
{ "success": true, "data": ..., "meta": {page,limit,total,totalPages}, "error": null }
{ "success": false, "data": null, "error": { "code":"VALIDATION_ERROR", "message":"...", "details": {...}, "requestId":"req_..." } }
```

Codes: `UNAUTHORIZED`(401), `FORBIDDEN`(403), `NOT_FOUND`(404), `CONFLICT`(409), `VALIDATION_ERROR`(422), `PAYLOAD_TOO_LARGE`(413), `INTERNAL_ERROR`(500).

## 13. Migration Path (from backend.md)

1. Backend now implements all endpoints (priority done: auth, products with type/isHighlight, official-partners, uploads).
2. Frontend swaps `useStore` `load(KEYS.*)` → `fetch` (keep localStorage fallback for offline dev).
3. `FileUpload` → `POST /admin/uploads`.
4. `GET /products?isHighlight=true` powers `HighlightedProductsSection`; ensure `next.config.ts` allows CDN.
5. Remove demo plain-text passwords; `auth.ts` `login()` → `POST /auth/login`.

## 14. Example cURL (from backend.md)

```bash
curl -X POST http://localhost:4000/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}'
curl -X POST http://localhost:4000/api/v1/admin/products -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"slug":"belgian-dark-72","cat":"choco","type":"home-brand","title":"Belgian Dark 72%","note":"Callets · Single origin Ecuador","tag":"Bulk · 2.5kg","img":"https://cdn.naturafoods.co.id/products/belgian.webp","desc":"...","isHighlight": true}'
curl http://localhost:4000/api/v1/products?isHighlight=true
curl -X PATCH http://localhost:4000/api/v1/admin/official-partners/bensdorp/publish -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"isPublished": false}'
curl -X POST http://localhost:4000/api/v1/admin/uploads -H "Authorization: Bearer <token>" -F "file=@./bensdorp.png" -F "folder=partners"
```
