/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication, login, OTP, password reset
 *   - name: Users
 *     description: Admin user management
 *   - name: Products
 *     description: Product catalog (choco & matcha)
 *   - name: Articles
 *     description: Multilingual articles (ID/EN/ZH)
 *   - name: Education
 *     description: Education content
 *   - name: Innovations
 *     description: Innovation showcases
 *   - name: Jobs
 *     description: Job listings
 *   - name: Inquiries
 *     description: Public inquiry form & admin management
 *   - name: Official Partners
 *     description: Partner directory
 *   - name: Site Content
 *     description: Per-locale site content overrides
 *   - name: Assistant
 *     description: AI assistant config and chat
 *   - name: Uploads
 *     description: File upload (R2 / local disk)
 *   - name: Stats
 *     description: Dashboard statistics
 *   - name: Roles
 *     description: Legacy role management
 *   - name: User Roles
 *     description: Legacy user-role assignments
 */

// ─── AUTH ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with username/email + password
 *     description: |
 *       Authenticates a user. In contract (v1) mode, returns JWT access + refresh tokens.
 *       In legacy mode, sends an OTP email and returns a user_id for OTP verification.
 *       Records login attempts for auditing.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/LoginResponse'
 *       422:
 *         description: Missing username/email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 */

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     description: Exchange a valid refresh token for a new access token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshRequest'
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/RefreshResponse'
 *       422:
 *         description: Missing refreshToken
 *       401:
 *         description: Invalid or revoked refresh token
 */

/**
 * @swagger
 * /auth/verify_otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP code (legacy flow)
 *     description: Verifies a 6-digit OTP code sent via email and returns JWT tokens.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, code]
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified, tokens issued
 *       400:
 *         description: Missing user_id or code
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /auth/resend_otp:
 *   post:
 *     tags: [Auth]
 *     summary: Resend OTP code
 *     description: Generates and sends a new OTP code to the user's email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: New OTP sent
 *       400:
 *         description: Missing user_id
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout (blacklist tokens)
 *     description: Blacklists the current access token. Optionally blacklists the refresh token too.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /auth/login_attempt:
 *   get:
 *     tags: [Auth]
 *     summary: List login attempts
 *     description: Returns up to 100 login attempts, ordered by most recent.
 *     parameters:
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filter by email
 *     responses:
 *       200:
 *         description: Array of login attempts
 */

/**
 * @swagger
 * /auth/forgot_password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset
 *     description: Sends a password reset link (JWT token, 1h expiry) to the user's email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Reset link sent
 *       404:
 *         description: Email not found
 */

/**
 * @swagger
 * /auth/reset_password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password with token
 *     description: Resets the user's password using the token from the forgot_password email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password updated
 *       400:
 *         description: Invalid or expired token
 */

// ─── ADMIN USERS ───────────────────────────────────────────────────

/**
 * @swagger
 * /admin/me:
 *   get:
 *     tags: [Users]
 *     summary: Get current admin profile
 *     description: Returns the authenticated user's profile.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserAdmin'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags: [Users]
 *     summary: List admin users
 *     description: Paginated list of admin users with search.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *         description: "Sort format: field:asc or field:desc"
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search across username, email, name
 *     responses:
 *       200:
 *         description: Paginated list of users
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserAdmin'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Unauthorized
 *
 *   post:
 *     tags: [Users]
 *     summary: Create admin user
 *     description: Creates a new admin user. Username is required; email defaults to {username}@example.com.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserAdmin'
 *       409:
 *         description: Username already exists
 *       422:
 *         description: Validation error (missing username, invalid format)
 */

/**
 * @swagger
 * /admin/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update admin user
 *     description: |
 *       Updates user fields. Password changes are restricted to self or super_admin.
 *       Role changes require super_admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *     responses:
 *       200:
 *         description: User updated
 *       403:
 *         description: Forbidden (non-super_admin trying to change password/role)
 *       404:
 *         description: User not found
 *       409:
 *         description: Username conflict
 *
 *   delete:
 *     tags: [Users]
 *     summary: Delete admin user
 *     description: Cannot delete self or the last user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: User deleted
 *       403:
 *         description: Cannot delete self
 *       404:
 *         description: User not found
 *       409:
 *         description: Cannot delete last user
 */

// ─── PRODUCTS ──────────────────────────────────────────────────────

/**
 * @swagger
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: List products (public)
 *     description: Paginated product listing with search and filters.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 8, maximum: 50 }
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *         description: "Sort format: createdAt:desc"
 *       - in: query
 *         name: cat
 *         schema: { type: string, enum: [choco, matcha] }
 *         description: Filter by category (excludes "all")
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [home-brand, small-pack, general] }
 *       - in: query
 *         name: isHighlight
 *         schema: { type: boolean }
 *       - in: query
 *         name: isPublished
 *         schema: { type: boolean }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search across title, slug, cat, tag, type
 *     responses:
 *       200:
 *         description: Paginated product list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 */

/**
 * @swagger
 * /products/highlighted:
 *   get:
 *     tags: [Products]
 *     summary: List highlighted/featured products
 *     description: Returns only products with isHighlight=true. Supports pagination and category filter.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 8, maximum: 50 }
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *       - in: query
 *         name: cat
 *         schema: { type: string, enum: [choco, matcha] }
 *     responses:
 *       200:
 *         description: Paginated highlighted product list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 */

/**
 * @swagger
 * /products/{slug}:
 *   get:
 *     tags: [Products]
 *     summary: Get product by slug
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 */

/**
 * @swagger
 * /admin/products:
 *   post:
 *     tags: [Products]
 *     summary: Create product (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductRequest'
 *     responses:
 *       201:
 *         description: Product created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Product'
 *       409:
 *         description: Slug already exists
 *       422:
 *         description: Validation error (invalid slug format or cat)
 */

/**
 * @swagger
 * /admin/products/{slug}:
 *   put:
 *     tags: [Products]
 *     summary: Update product (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductRequest'
 *     responses:
 *       200:
 *         description: Product updated
 *       404:
 *         description: Product not found
 *       409:
 *         description: Slug conflict
 *
 *   delete:
 *     tags: [Products]
 *     summary: Delete product (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Product deleted
 *       404:
 *         description: Product not found
 */

/**
 * @swagger
 * /admin/products/{slug}/highlight:
 *   patch:
 *     tags: [Products]
 *     summary: Toggle product highlight (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isHighlight]
 *             properties:
 *               isHighlight:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Highlight status updated
 *       404:
 *         description: Product not found
 */

// ─── ARTICLES ──────────────────────────────────────────────────────

/**
 * @swagger
 * /articles:
 *   get:
 *     tags: [Articles]
 *     summary: List articles (public)
 *     description: Paginated article listing with multilingual search.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *         description: "Sort: date:asc, date:desc, createdAt:asc, createdAt:desc"
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, published] }
 *       - in: query
 *         name: isPublished
 *         schema: { type: boolean }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search across slug, titleID, titleEN, titleZN, category, excerpt
 *     responses:
 *       200:
 *         description: Paginated article list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Article'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 */

/**
 * @swagger
 * /articles/{slug}:
 *   get:
 *     tags: [Articles]
 *     summary: Get article by slug
 *     description: Looks up by slug first, falls back to ID.
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Article details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Article'
 *       404:
 *         description: Article not found
 */

/**
 * @swagger
 * /admin/articles:
 *   post:
 *     tags: [Articles]
 *     summary: Create article (admin)
 *     description: Creates a new article. slug and title are required. Supports field aliases (title->titleEN, content->contentEN).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateArticleRequest'
 *     responses:
 *       201:
 *         description: Article created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Article'
 *       409:
 *         description: Slug already exists
 *       422:
 *         description: Validation error (missing slug/title)
 */

/**
 * @swagger
 * /admin/articles/{slug}:
 *   put:
 *     tags: [Articles]
 *     summary: Update article (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateArticleRequest'
 *     responses:
 *       200:
 *         description: Article updated
 *       404:
 *         description: Article not found
 *       409:
 *         description: Slug conflict
 *
 *   delete:
 *     tags: [Articles]
 *     summary: Delete article (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Article deleted
 *       404:
 *         description: Article not found
 */

/**
 * @swagger
 * /admin/articles/{slug}/publish:
 *   patch:
 *     tags: [Articles]
 *     summary: Publish/unpublish article (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isPublished:
 *                 type: boolean
 *               status:
 *                 type: string
 *                 enum: [draft, published]
 *     responses:
 *       200:
 *         description: Publish status updated
 *       404:
 *         description: Article not found
 */

// ─── EDUCATION ─────────────────────────────────────────────────────

/**
 * @swagger
 * /education:
 *   get:
 *     tags: [Education]
 *     summary: List education content (public)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *       - in: query
 *         name: level
 *         schema: { type: string }
 *         description: Filter by level
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search across title, desc, level
 *     responses:
 *       200:
 *         description: Paginated education list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Education'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 */

/**
 * @swagger
 * /education/{id}:
 *   get:
 *     tags: [Education]
 *     summary: Get education by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Education details
 *       404:
 *         description: Not found
 */

/**
 * @swagger
 * /admin/education:
 *   post:
 *     tags: [Education]
 *     summary: Create education content (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEducationRequest'
 *     responses:
 *       201:
 *         description: Education created
 *       409:
 *         description: ID already exists
 *       422:
 *         description: Missing id or title
 */

/**
 * @swagger
 * /admin/education/{id}:
 *   put:
 *     tags: [Education]
 *     summary: Update education content (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEducationRequest'
 *     responses:
 *       200:
 *         description: Education updated
 *       404:
 *         description: Not found
 *       409:
 *         description: ID conflict (if renaming)
 *
 *   delete:
 *     tags: [Education]
 *     summary: Delete education content (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Not found
 */

// ─── INNOVATIONS ───────────────────────────────────────────────────

/**
 * @swagger
 * /innovations:
 *   get:
 *     tags: [Innovations]
 *     summary: List innovations (public)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search across title, desc, tag
 *     responses:
 *       200:
 *         description: Paginated innovation list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Innovation'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 */

/**
 * @swagger
 * /innovations/{id}:
 *   get:
 *     tags: [Innovations]
 *     summary: Get innovation by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Innovation details
 *       404:
 *         description: Not found
 */

/**
 * @swagger
 * /admin/innovations:
 *   post:
 *     tags: [Innovations]
 *     summary: Create innovation (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInnovationRequest'
 *     responses:
 *       201:
 *         description: Innovation created
 *       409:
 *         description: ID already exists
 *       422:
 *         description: Missing id or title
 */

/**
 * @swagger
 * /admin/innovations/{id}:
 *   put:
 *     tags: [Innovations]
 *     summary: Update innovation (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInnovationRequest'
 *     responses:
 *       200:
 *         description: Innovation updated
 *       404:
 *         description: Not found
 *
 *   delete:
 *     tags: [Innovations]
 *     summary: Delete innovation (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Not found
 */

// ─── JOBS ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /jobs:
 *   get:
 *     tags: [Jobs]
 *     summary: List job listings (public)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *       - in: query
 *         name: dept
 *         schema: { type: string }
 *         description: Filter by department
 *       - in: query
 *         name: loc
 *         schema: { type: string }
 *         description: Filter by location
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *         description: Filter by job type
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search across title, dept, loc, type
 *     responses:
 *       200:
 *         description: Paginated job list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Job'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 */

/**
 * @swagger
 * /jobs/{id}:
 *   get:
 *     tags: [Jobs]
 *     summary: Get job by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Job details
 *       404:
 *         description: Not found
 */

/**
 * @swagger
 * /admin/jobs:
 *   post:
 *     tags: [Jobs]
 *     summary: Create job listing (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateJobRequest'
 *     responses:
 *       201:
 *         description: Job created
 *       409:
 *         description: ID already exists
 *       422:
 *         description: Missing id or title
 */

/**
 * @swagger
 * /admin/jobs/{id}:
 *   put:
 *     tags: [Jobs]
 *     summary: Update job listing (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateJobRequest'
 *     responses:
 *       200:
 *         description: Job updated
 *       404:
 *         description: Not found
 *
 *   delete:
 *     tags: [Jobs]
 *     summary: Delete job listing (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Not found
 */

// ─── INQUIRIES ─────────────────────────────────────────────────────

/**
 * @swagger
 * /inquiries:
 *   post:
 *     tags: [Inquiries]
 *     summary: Submit inquiry (public, rate-limited)
 *     description: |
 *       Public endpoint for submitting inquiries. Rate limited to 5 requests per minute per IP.
 *       Requires name, city, whatsapp, and interest.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInquiryRequest'
 *     responses:
 *       201:
 *         description: Inquiry submitted
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Inquiry'
 *       422:
 *         description: Missing required fields
 *       429:
 *         description: Rate limit exceeded (5 req/min)
 */

/**
 * @swagger
 * /admin/inquiries:
 *   get:
 *     tags: [Inquiries]
 *     summary: List inquiries (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *       - in: query
 *         name: interest
 *         schema: { type: string }
 *         description: Filter by interest
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *         description: Filter by city
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search across name, city, whatsapp, interest, email
 *     responses:
 *       200:
 *         description: Paginated inquiry list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Inquiry'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 */

/**
 * @swagger
 * /admin/inquiries/export:
 *   get:
 *     tags: [Inquiries]
 *     summary: Export inquiries as CSV
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         required: true
 *         schema: { type: string, enum: [csv] }
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 */

/**
 * @swagger
 * /admin/inquiries/{id}:
 *   delete:
 *     tags: [Inquiries]
 *     summary: Delete inquiry (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Not found
 */

// ─── OFFICIAL PARTNERS ─────────────────────────────────────────────

/**
 * @swagger
 * /official-partners:
 *   get:
 *     tags: [Official Partners]
 *     summary: List official partners (public)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *       - in: query
 *         name: isPublished
 *         schema: { type: boolean }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search across name, id, description
 *     responses:
 *       200:
 *         description: Paginated partner list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/OfficialPartner'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 */

/**
 * @swagger
 * /official-partners/{id}:
 *   get:
 *     tags: [Official Partners]
 *     summary: Get partner by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Partner details
 *       404:
 *         description: Not found
 */

/**
 * @swagger
 * /admin/official-partners:
 *   post:
 *     tags: [Official Partners]
 *     summary: Create partner (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOfficialPartnerRequest'
 *     responses:
 *       201:
 *         description: Partner created
 *       409:
 *         description: ID already exists
 *       422:
 *         description: Missing required fields
 */

/**
 * @swagger
 * /admin/official-partners/{id}:
 *   put:
 *     tags: [Official Partners]
 *     summary: Update partner (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOfficialPartnerRequest'
 *     responses:
 *       200:
 *         description: Partner updated
 *       404:
 *         description: Not found
 *
 *   delete:
 *     tags: [Official Partners]
 *     summary: Delete partner (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Not found
 */

/**
 * @swagger
 * /admin/official-partners/{id}/publish:
 *   patch:
 *     tags: [Official Partners]
 *     summary: Toggle partner publish status (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isPublished]
 *             properties:
 *               isPublished:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Publish status updated
 *       404:
 *         description: Not found
 */

/**
 * @swagger
 * /admin/official-partners/reorder:
 *   patch:
 *     tags: [Official Partners]
 *     summary: Reorder partners (admin)
 *     description: Sets the display order of partners based on the provided ID array order.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ids]
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of partner IDs in desired order
 *     responses:
 *       200:
 *         description: Order updated
 *       422:
 *         description: ids is not an array
 */

// ─── SITE CONTENT ──────────────────────────────────────────────────

/**
 * @swagger
 * /site-content:
 *   get:
 *     tags: [Site Content]
 *     summary: Get all site content overrides (public)
 *     description: Returns all locale overrides as a keyed object { id: {...}, en: {...}, zh: {...} }.
 *     responses:
 *       200:
 *         description: All locale content
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       description: "Keyed by locale: { id: {...}, en: {...}, zh: {...} }"
 *
 *   delete:
 *     tags: [Site Content]
 *     summary: Delete ALL site content (admin)
 *     description: Destroys all site content rows across all locales. Use with caution.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: All site content deleted
 */

/**
 * @swagger
 * /site-content/{locale}:
 *   get:
 *     tags: [Site Content]
 *     summary: Get site content for a locale (public)
 *     parameters:
 *       - in: path
 *         name: locale
 *         required: true
 *         schema: { type: string, enum: [id, en, zh] }
 *     responses:
 *       200:
 *         description: Content overrides for locale
 *       422:
 *         description: Invalid locale
 */

/**
 * @swagger
 * /admin/site-content/{locale}:
 *   put:
 *     tags: [Site Content]
 *     summary: Upsert site content for locale (admin)
 *     description: Replaces the entire overrides object for the given locale.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: locale
 *         required: true
 *         schema: { type: string, enum: [id, en, zh] }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Arbitrary JSON object of content overrides
 *     responses:
 *       200:
 *         description: Content updated
 *       422:
 *         description: Invalid locale or body is not an object
 *
 *   delete:
 *     tags: [Site Content]
 *     summary: Delete site content for locale (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: locale
 *         required: true
 *         schema: { type: string, enum: [id, en, zh] }
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Not found
 *
 *   patch:
 *     tags: [Site Content]
 *     summary: Deep-merge site content at path (admin)
 *     description: Partially updates content by deep-merging a value at a nested path. Creates the locale row if it doesn't exist.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: locale
 *         required: true
 *         schema: { type: string, enum: [id, en, zh] }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [path]
 *             properties:
 *               path:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: "Nested key path, e.g. [\"hero\", \"title\"]"
 *               value:
 *                 description: The value to set at that path
 *     responses:
 *       200:
 *         description: Content updated
 *       422:
 *         description: Invalid locale or path is not array
 */

// ─── ASSISTANT ─────────────────────────────────────────────────────

/**
 * @swagger
 * /assistant/config:
 *   get:
 *     tags: [Assistant]
 *     summary: Get assistant configuration (public)
 *     description: Returns the assistant config. Creates a default config if none exists. Cached for 5 minutes.
 *     responses:
 *       200:
 *         description: Assistant configuration
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AssistantConfig'
 */

/**
 * @swagger
 * /admin/assistant/config:
 *   put:
 *     tags: [Assistant]
 *     summary: Update assistant configuration (admin)
 *     description: Updates only the provided fields.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               waLink:
 *                 type: string
 *               persona:
 *                 type: string
 *               tuning:
 *                 type: object
 *               copy:
 *                 type: object
 *               knowledge:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Config updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AssistantConfig'
 */

/**
 * @swagger
 * /admin/assistant/config/reset:
 *   post:
 *     tags: [Assistant]
 *     summary: Reset assistant to defaults (admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Config reset to defaults
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AssistantConfig'
 */

/**
 * @swagger
 * /assistant/chat:
 *   post:
 *     tags: [Assistant]
 *     summary: Send chat message (public)
 *     description: |
 *       Keyword-matches the message against knowledge entries and returns a reply.
 *       Falls back to the configured fallback copy if no match is found.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatRequest'
 *     responses:
 *       200:
 *         description: Chat reply
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ChatResponse'
 *       422:
 *         description: Missing message
 */

// ─── UPLOADS ───────────────────────────────────────────────────────

/**
 * @swagger
 * /admin/uploads:
 *   post:
 *     tags: [Uploads]
 *     summary: Upload file (admin, multipart)
 *     description: |
 *       Uploads a file via multipart form data. Images (max 5MB) are auto-converted to WebP (1600px max).
 *       Videos up to 20MB are allowed as-is. Files are stored to Cloudflare R2 or local disk.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image or video file
 *               folder:
 *                 type: string
 *                 default: general
 *                 description: Storage folder prefix
 *     responses:
 *       201:
 *         description: File uploaded
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UploadResponse'
 *       413:
 *         description: File too large
 *       422:
 *         description: No file provided
 *
 *   delete:
 *     tags: [Uploads]
 *     summary: Delete uploaded file (admin)
 *     description: Deletes a file from R2 and/or local disk. Path traversal is blocked.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 description: File URL (provide url OR key)
 *               key:
 *                 type: string
 *                 description: Storage key (provide key OR url)
 *     parameters:
 *       - in: query
 *         name: url
 *         schema: { type: string }
 *         description: File URL (alternative to body)
 *     responses:
 *       200:
 *         description: File deleted
 *       404:
 *         description: File not found
 *       422:
 *         description: No url or key provided
 */

/**
 * @swagger
 * /admin/uploads/base64:
 *   post:
 *     tags: [Uploads]
 *     summary: Upload file via base64 data URL (admin)
 *     description: |
 *       Uploads a file from a base64 data URL string. Must start with "data:".
 *       Same storage and size limits as the multipart endpoint.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dataUrl]
 *             properties:
 *               dataUrl:
 *                 type: string
 *                 description: "Base64 data URL, e.g. data:image/png;base64,..."
 *               folder:
 *                 type: string
 *                 default: general
 *     responses:
 *       201:
 *         description: File uploaded
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UploadResponse'
 *       413:
 *         description: File too large
 *       422:
 *         description: Invalid data URL or non-image/video
 */

// ─── STATS ─────────────────────────────────────────────────────────

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     tags: [Stats]
 *     summary: Get dashboard statistics (admin)
 *     description: Aggregated counts from all major models for the admin dashboard.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/DashboardStats'
 *       401:
 *         description: Unauthorized
 */

// ─── LEGACY: ROLES ─────────────────────────────────────────────────

/**
 * @swagger
 * /api/roles:
 *   get:
 *     tags: [Roles]
 *     summary: List all roles (legacy)
 *     deprecated: true
 *     responses:
 *       200:
 *         description: Array of roles
 *
 *   post:
 *     tags: [Roles]
 *     summary: Create role (legacy)
 *     deprecated: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Role created
 *       409:
 *         description: Name already exists
 */

/**
 * @swagger
 * /api/roles/{id}:
 *   get:
 *     tags: [Roles]
 *     summary: Get role by ID (legacy)
 *     deprecated: true
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Role details
 *       404:
 *         description: Not found
 *
 *   put:
 *     tags: [Roles]
 *     summary: Update role (legacy)
 *     deprecated: true
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Role updated
 *       404:
 *         description: Not found
 *
 *   delete:
 *     tags: [Roles]
 *     summary: Delete role (legacy)
 *     deprecated: true
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Not found
 */

// ─── LEGACY: USER ROLES ────────────────────────────────────────────

/**
 * @swagger
 * /api/user-roles:
 *   get:
 *     tags: [User Roles]
 *     summary: List all user-role assignments (legacy)
 *     deprecated: true
 *     responses:
 *       200:
 *         description: Array of user-role assignments with User and Role details
 *
 *   post:
 *     tags: [User Roles]
 *     summary: Assign role to user (legacy)
 *     deprecated: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, role_id]
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *               role_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Assignment created
 *       404:
 *         description: User or role not found
 *       409:
 *         description: Assignment already exists
 */

/**
 * @swagger
 * /api/user-roles/user/{userId}:
 *   get:
 *     tags: [User Roles]
 *     summary: Get roles for a user (legacy)
 *     deprecated: true
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User's role assignments
 *       404:
 *         description: No roles found
 *
 *   put:
 *     tags: [User Roles]
 *     summary: Replace all roles for a user (legacy)
 *     deprecated: true
 *     description: Replaces ALL existing roles with the provided list.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role_ids]
 *             properties:
 *               role_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Roles updated
 *       400:
 *         description: Invalid role_ids
 *       404:
 *         description: User not found
 *
 *   delete:
 *     tags: [User Roles]
 *     summary: Remove all roles from user (legacy)
 *     deprecated: true
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: All roles removed
 *       404:
 *         description: No assignments found
 */

/**
 * @swagger
 * /api/user-roles/user/{userId}/role/{roleId}:
 *   delete:
 *     tags: [User Roles]
 *     summary: Remove specific role from user (legacy)
 *     deprecated: true
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Role removed
 *       404:
 *         description: Assignment not found
 */
