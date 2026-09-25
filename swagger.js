const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "NaturaFoods API",
      version: "1.0.0",
      description:
        "Backend API for NaturaFoods — a HORECA baking ingredients platform. Supports products, articles, education, innovations, jobs, inquiries, official partners, site content, assistant, file uploads, and admin user management.\n\n" +
        "## Authentication\n" +
        "Admin endpoints require a Bearer JWT token in the `Authorization` header.\n" +
        "Obtain tokens via `POST /api/v1/auth/login`.\n\n" +
        "## Response Envelope\n" +
        "All v1 endpoints return a standard envelope:\n" +
        "```json\n{ \"success\": true, \"data\": ..., \"meta\": ..., \"error\": null }\n```\n" +
        "Error responses:\n" +
        "```json\n{ \"success\": false, \"data\": null, \"error\": { \"code\": \"ERROR_CODE\", \"message\": \"...\", \"details\": null, \"requestId\": \"req_...\" } }\n```",
      contact: {
        name: "NaturaFoods API Support",
        url: "https://naturafoods.co.id",
      },
      license: {
        name: "Private",
      },
    },
    servers: [
      {
        url: "http://localhost:4000/api/v1",
        description: "Local development",
      },
      {
        url: "https://staging-api-naturafoods.alvineitsolutions.com/api/v1",
        description: "Staging",
      },
      {
        url: "https://api.naturaintisukses.com/api/v1",
        description: "Production",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "JWT access token. Obtain via POST /auth/login. Access tokens expire in 1 hour.",
        },
      },
      schemas: {
        // ─── Standard Envelope ──────────────────────────────────────
        SuccessEnvelope: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { description: "Response payload" },
            meta: {
              oneOf: [
                { $ref: "#/components/schemas/PaginationMeta" },
                { type: "null" },
              ],
            },
            error: { type: "null" },
          },
        },
        ErrorEnvelope: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            data: { type: "null" },
            meta: { type: "null" },
            error: { $ref: "#/components/schemas/ApiError" },
          },
        },
        ApiError: {
          type: "object",
          properties: {
            code: {
              type: "string",
              enum: [
                "UNAUTHORIZED",
                "FORBIDDEN",
                "NOT_FOUND",
                "CONFLICT",
                "VALIDATION_ERROR",
                "PAYLOAD_TOO_LARGE",
                "TOO_MANY_REQUESTS",
                "INTERNAL_ERROR",
              ],
            },
            message: { type: "string" },
            details: { nullable: true },
            requestId: { type: "string", example: "req_abc123def456" },
          },
        },
        PaginationMeta: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 10 },
            total: { type: "integer", example: 42 },
            totalPages: { type: "integer", example: 5 },
          },
        },

        // ─── Auth ───────────────────────────────────────────────────
        LoginRequest: {
          type: "object",
          required: ["password"],
          properties: {
            username: {
              type: "string",
              description: "Username (provide username OR email)",
              example: "admin",
            },
            email: {
              type: "string",
              format: "email",
              description: "Email (provide email OR username)",
              example: "admin@naturafoods.co.id",
            },
            password: { type: "string", example: "secret123" },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            accessToken: { type: "string" },
            refreshToken: { type: "string" },
            expiresIn: { type: "integer", example: 3600 },
            user: { $ref: "#/components/schemas/UserPublic" },
          },
        },
        RefreshRequest: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: { type: "string" },
          },
        },
        RefreshResponse: {
          type: "object",
          properties: {
            accessToken: { type: "string" },
            expiresIn: { type: "integer", example: 3600 },
          },
        },
        ForgotPasswordRequest: {
          type: "object",
          required: ["email"],
          properties: {
            email: { type: "string", format: "email" },
          },
        },
        ResetPasswordRequest: {
          type: "object",
          required: ["token", "password"],
          properties: {
            token: { type: "string", description: "Password reset JWT token" },
            password: { type: "string", minLength: 6 },
          },
        },

        // ─── User ───────────────────────────────────────────────────
        UserPublic: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            username: { type: "string" },
            email: { type: "string", format: "email" },
            name: { type: "string" },
            role: { type: "string", enum: ["admin", "super_admin"] },
          },
        },
        UserAdmin: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            username: { type: "string" },
            email: { type: "string", format: "email" },
            name: { type: "string" },
            role: { type: "string", enum: ["admin", "super_admin"] },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateUserRequest: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: {
              type: "string",
              pattern: "^[a-zA-Z0-9._-]+$",
              minLength: 3,
              maxLength: 32,
            },
            password: { type: "string", minLength: 6 },
            email: {
              type: "string",
              format: "email",
              description: "Defaults to {username}@example.com",
            },
            name: { type: "string", description: "Defaults to username" },
            role: {
              type: "string",
              enum: ["admin", "super_admin"],
              default: "admin",
            },
          },
        },
        UpdateUserRequest: {
          type: "object",
          properties: {
            username: {
              type: "string",
              pattern: "^[a-zA-Z0-9._-]+$",
              minLength: 3,
              maxLength: 32,
            },
            password: {
              type: "string",
              minLength: 6,
              description: "Only self or super_admin can change",
            },
            email: { type: "string", format: "email" },
            name: { type: "string" },
            role: {
              type: "string",
              enum: ["admin", "super_admin"],
              description: "Only super_admin can change",
            },
          },
        },

        // ─── Product ────────────────────────────────────────────────
        Product: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            slug: { type: "string", example: "dark-choco-powder" },
            cat: { type: "string", enum: ["choco", "matcha", "other"] },
            type: {
              type: "string",
              enum: ["home-brand", "small-pack", "general"],
            },
            title: { type: "string" },
            note: { type: "string", nullable: true },
            tag: { type: "string", nullable: true },
            img: { type: "string", description: "Image URL" },
            file: { type: "string", nullable: true, description: "File URL" },
            brandId: { type: "string", format: "uuid", nullable: true },
            brand: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "string", format: "uuid" },
                slug: { type: "string" },
                name: { type: "string" },
              },
            },
            desc: { type: "string", nullable: true },
            isHighlight: { type: "boolean" },
            isPublished: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateProductRequest: {
          type: "object",
          required: ["slug", "cat", "title", "img"],
          properties: {
            slug: {
              type: "string",
              pattern: "^[a-z0-9-]+$",
              minLength: 3,
              maxLength: 64,
            },
            cat: { type: "string", enum: ["choco", "matcha", "other"] },
            title: { type: "string", minLength: 2, maxLength: 120 },
            img: { type: "string" },
            file: { type: "string", nullable: true, description: "Optional file URL; null/empty clears it" },
            brandId: {
              type: "string",
              format: "uuid",
              description: "Optional brand id (see GET /brands)",
            },
            type: {
              type: "string",
              enum: ["home-brand", "small-pack", "general"],
              default: "general",
            },
            note: { type: "string" },
            tag: { type: "string" },
            desc: { type: "string" },
            isHighlight: { type: "boolean", default: false },
            isPublished: { type: "boolean", default: true },
          },
        },

        // ─── Brand ──────────────────────────────────────────────────
        Brand: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            slug: { type: "string", example: "bensdorp" },
            name: { type: "string" },
            description: { type: "string", nullable: true },
            logo: { type: "string", nullable: true, description: "Logo URL" },
            isActive: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateBrandRequest: {
          type: "object",
          required: ["slug", "name"],
          properties: {
            slug: {
              type: "string",
              pattern: "^[a-z0-9-]+$",
              minLength: 3,
              maxLength: 64,
            },
            name: { type: "string", minLength: 2, maxLength: 120 },
            description: { type: "string" },
            logo: { type: "string", nullable: true, description: "Optional logo URL; null/empty clears it" },
            isActive: { type: "boolean", default: true },
          },
        },

        // ─── Article ────────────────────────────────────────────────
        Article: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            slug: { type: "string" },
            title: { type: "string" },
            titleID: { type: "string", description: "Indonesian title" },
            titleEN: { type: "string", description: "English title" },
            titleZN: { type: "string", description: "Chinese title" },
            category: { type: "string" },
            excerpt: { type: "string", nullable: true },
            keywords: { type: "string", nullable: true },
            status: { type: "string", enum: ["draft", "published"] },
            isPublished: { type: "boolean" },
            date: { type: "string", format: "date" },
            published_date: {
              type: "string",
              format: "date",
              nullable: true,
            },
            thumbnail: { type: "string", nullable: true },
            img: { type: "string", nullable: true },
            content: { type: "string", description: "Alias for contentEN" },
            contentID: { type: "string", description: "Indonesian content" },
            contentEN: { type: "string", description: "English content" },
            contentZN: { type: "string", description: "Chinese content" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateArticleRequest: {
          type: "object",
          required: ["slug", "title"],
          properties: {
            slug: {
              type: "string",
              pattern: "^[a-z0-9-]+$",
              minLength: 3,
              maxLength: 64,
            },
            title: { type: "string", description: "Maps to titleEN" },
            titleID: { type: "string" },
            titleEN: { type: "string" },
            titleZN: { type: "string" },
            category: { type: "string" },
            excerpt: { type: "string" },
            keywords: { type: "string" },
            status: { type: "string", enum: ["draft", "published"] },
            isPublished: { type: "boolean" },
            published_date: { type: "string", format: "date" },
            date: { type: "string", format: "date" },
            thumbnail: { type: "string" },
            img: { type: "string" },
            content: { type: "string", description: "Maps to contentEN" },
            contentID: { type: "string" },
            contentEN: { type: "string" },
            contentZN: { type: "string" },
          },
        },

        // ─── Education ──────────────────────────────────────────────
        Education: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            desc: { type: "string", nullable: true },
            duration: { type: "string", nullable: true },
            level: { type: "string", nullable: true },
            img: { type: "string", nullable: true },
            eyebrow: { type: "string", nullable: true },
            cta: { type: "string", nullable: true },
            link: { type: "string", nullable: true },
            isPublished: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateEducationRequest: {
          type: "object",
          required: ["id", "title"],
          properties: {
            id: { type: "string", maxLength: 64 },
            title: { type: "string", maxLength: 200 },
            desc: { type: "string" },
            duration: { type: "string", maxLength: 100 },
            level: { type: "string", maxLength: 100 },
            img: { type: "string" },
            eyebrow: { type: "string", maxLength: 200 },
            cta: { type: "string", maxLength: 200 },
            link: { type: "string" },
            isPublished: { type: "boolean", default: true },
          },
        },

        // ─── Innovation ─────────────────────────────────────────────
        Innovation: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            desc: { type: "string", nullable: true },
            tag: { type: "string", nullable: true },
            img: { type: "string", nullable: true },
            eyebrow: { type: "string", nullable: true },
            link: { type: "string", nullable: true },
            cta: { type: "string", nullable: true },
            isPublished: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateInnovationRequest: {
          type: "object",
          required: ["id", "title"],
          properties: {
            id: { type: "string", maxLength: 64 },
            title: { type: "string", maxLength: 200 },
            desc: { type: "string" },
            tag: { type: "string", maxLength: 100 },
            img: { type: "string" },
            eyebrow: { type: "string", maxLength: 200 },
            link: { type: "string" },
            cta: { type: "string", maxLength: 200 },
            isPublished: { type: "boolean", default: true },
          },
        },

        // ─── Job ────────────────────────────────────────────────────
        Job: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            dept: { type: "string", nullable: true },
            loc: { type: "string", nullable: true },
            type: { type: "string", nullable: true },
            desc: { type: "string", nullable: true },
            isPublished: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateJobRequest: {
          type: "object",
          required: ["id", "title"],
          properties: {
            id: { type: "string", maxLength: 64 },
            title: { type: "string", maxLength: 200 },
            dept: { type: "string", maxLength: 100 },
            loc: { type: "string", maxLength: 100 },
            type: { type: "string", maxLength: 100 },
            desc: { type: "string" },
            isPublished: { type: "boolean", default: true },
          },
        },

        // ─── HomeBrand ─────────────────────────────────────────────
        HomeBrand: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            image: { type: "string", nullable: true },
            desc: { type: "string", nullable: true },
            brandIds: {
              type: "array",
              items: { type: "string", format: "uuid" },
              description: "Ids of the brands for this home brand (stored as JSON)",
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateHomeBrandRequest: {
          type: "object",
          required: ["id", "name"],
          properties: {
            id: { type: "string", maxLength: 64 },
            name: { type: "string", maxLength: 150 },
            image: { type: "string" },
            desc: { type: "string" },
            brandIds: {
              type: "array",
              items: { type: "string", format: "uuid" },
              description: "Optional brand ids; replaces the existing value on PUT, [] clears it",
            },
          },
        },

        // ─── Sale ───────────────────────────────────────────────────
        Sale: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            gender: { type: "string", nullable: true },
            position: { type: "string", nullable: true },
            whatsapp: { type: "string", nullable: true },
            email: { type: "string", format: "email", nullable: true },
            photo: { type: "string", nullable: true },
            location: { type: "string", nullable: true },
            isPublished: { type: "boolean" },
            published: { type: "boolean", description: "Alias of isPublished" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateSaleRequest: {
          type: "object",
          required: ["id", "name"],
          properties: {
            id: { type: "string", maxLength: 64 },
            name: { type: "string", maxLength: 150 },
            gender: { type: "string", maxLength: 20 },
            position: { type: "string", maxLength: 100 },
            whatsapp: { type: "string", maxLength: 30 },
            email: { type: "string", format: "email" },
            photo: { type: "string" },
            location: { type: "string", maxLength: 100 },
            isPublished: { type: "boolean", default: true },
            published: { type: "boolean", description: "Alias of isPublished" },
          },
        },

        // ─── Official Partner ───────────────────────────────────────
        OfficialPartner: {
          type: "object",
          properties: {
            id: { type: "string", pattern: "^[a-z0-9-_]+$" },
            name: { type: "string" },
            description: { type: "string", nullable: true },
            images: { type: "array", items: { type: "string" }, minItems: 1 },
            background: { type: "string" },
            isPublished: { type: "boolean" },
            link: { type: "string", nullable: true },
            color: { type: "string", nullable: true },
            order: { type: "integer" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateOfficialPartnerRequest: {
          type: "object",
          required: ["id", "name", "images", "background"],
          properties: {
            id: {
              type: "string",
              pattern: "^[a-z0-9-_]+$",
              minLength: 2,
              maxLength: 64,
            },
            name: { type: "string", maxLength: 120 },
            description: { type: "string" },
            images: { type: "array", items: { type: "string", maxLength: 500 }, minItems: 1 },
            background: { type: "string", maxLength: 500 },
            isPublished: { type: "boolean", default: true },
            link: { type: "string" },
            color: { type: "string", maxLength: 20 },
            order: { type: "integer", default: 0 },
          },
        },

        // ─── Inquiry ────────────────────────────────────────────────
        Inquiry: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            city: { type: "string" },
            whatsapp: { type: "string" },
            interest: { type: "string" },
            email: { type: "string", format: "email", nullable: true },
            message: { type: "string", nullable: true },
            source: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        CreateInquiryRequest: {
          type: "object",
          required: ["name", "city", "whatsapp", "interest"],
          properties: {
            name: { type: "string", maxLength: 150 },
            city: { type: "string", maxLength: 100 },
            whatsapp: { type: "string", maxLength: 30 },
            interest: { type: "string", maxLength: 100 },
            email: { type: "string", format: "email" },
            message: { type: "string" },
            source: { type: "string", maxLength: 100 },
          },
        },

        // ─── Site Content ───────────────────────────────────────────
        SiteContent: {
          type: "object",
          properties: {
            locale: {
              type: "string",
              enum: ["id", "en", "zh"],
            },
            overrides: {
              type: "object",
              description: "Arbitrary JSON object of content overrides",
            },
          },
        },

        // ─── Assistant ──────────────────────────────────────────────
        AssistantConfig: {
          type: "object",
          properties: {
            id: { type: "string", example: "default" },
            waLink: { type: "string", description: "WhatsApp link" },
            persona: { type: "string", description: "Chatbot persona text" },
            tuning: {
              type: "object",
              properties: {
                tone: { type: "string" },
                length: { type: "string" },
                strict: { type: "boolean" },
              },
            },
            copy: {
              type: "object",
              description: "UI copy in 3 locales (id, en, zh)",
            },
            knowledge: {
              type: "array",
              items: { type: "object" },
              description: "Knowledge base entries for keyword matching",
            },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        ChatRequest: {
          type: "object",
          required: ["message"],
          properties: {
            message: { type: "string" },
            locale: {
              type: "string",
              enum: ["id", "en", "zh"],
              default: "id",
            },
          },
        },
        ChatResponse: {
          type: "object",
          properties: {
            reply: { type: "string" },
            matchedEntryId: {
              type: "string",
              nullable: true,
              description: "ID of matched knowledge entry, or null for fallback",
            },
          },
        },

        CompanySetting: {
          type: "object",
          properties: {
            id: { type: "string", example: "default" },
            name: { type: "string", example: "PT Natura Inti Sukses" },
            logo: { type: "string", nullable: true, description: "Logo URL" },
            description: { type: "string", nullable: true },
            visi: { type: "string", nullable: true, description: "Company vision" },
            misi: { type: "string", nullable: true, description: "Company mission" },
            vision: { type: "string", nullable: true, description: "Alias of visi" },
            mission: { type: "string", nullable: true, description: "Alias of misi" },
            tagline: { type: "string", nullable: true },
            email: { type: "string", nullable: true },
            phone: { type: "string", nullable: true },
            whatsapp: { type: "string", nullable: true },
            address: { type: "string", nullable: true },
            website: { type: "string", nullable: true },
            instagram: { type: "string", nullable: true },
            facebook: { type: "string", nullable: true },
            tiktok: { type: "string", nullable: true },
            youtube: { type: "string", nullable: true },
            mapsUrl: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        UpdateCompanySettingRequest: {
          type: "object",
          properties: {
            name: { type: "string", maxLength: 200 },
            logo: { type: "string", nullable: true },
            description: { type: "string", nullable: true },
            visi: { type: "string", nullable: true },
            misi: { type: "string", nullable: true },
            vision: { type: "string", nullable: true, description: "Alias of visi" },
            mission: { type: "string", nullable: true, description: "Alias of misi" },
            tagline: { type: "string", nullable: true },
            email: { type: "string", nullable: true },
            phone: { type: "string", nullable: true },
            whatsapp: { type: "string", nullable: true },
            address: { type: "string", nullable: true },
            website: { type: "string", nullable: true },
            instagram: { type: "string", nullable: true },
            facebook: { type: "string", nullable: true },
            tiktok: { type: "string", nullable: true },
            youtube: { type: "string", nullable: true },
            mapsUrl: { type: "string", nullable: true },
          },
        },

        // ─── Upload ─────────────────────────────────────────────────
        UploadResponse: {
          type: "object",
          properties: {
            url: { type: "string", description: "Public URL of uploaded file" },
            key: { type: "string", description: "Storage key" },
            originalName: { type: "string" },
            size: { type: "integer", description: "File size in bytes" },
            mime: { type: "string", description: "MIME type" },
          },
        },

        // ─── Stats ──────────────────────────────────────────────────
        DashboardStats: {
          type: "object",
          properties: {
            products: { type: "integer" },
            productsHighlighted: { type: "integer" },
            officialPartners: { type: "integer" },
            officialPartnersPublished: { type: "integer" },
            articles: { type: "integer" },
            education: { type: "integer" },
            innovation: { type: "integer" },
            jobs: { type: "integer" },
            sales: { type: "integer" },
            homeBrands: { type: "integer" },
            inquiries: { type: "integer" },
            users: { type: "integer" },
            assistantEntries: { type: "integer" },
            contentOverrides: { type: "integer" },
            counts: {
              type: "array",
              items: { type: "integer" },
              description:
                "Flat array for frontend: [products, partners, articles, education, innovation, jobs, inquiries, users, assistantEntries, contentOverrides]",
            },
          },
        },

        // ─── Role ───────────────────────────────────────────────────
        Role: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            description: { type: "string", nullable: true },
          },
        },

        // ─── UserRole ───────────────────────────────────────────────
        UserRole: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
            role_id: { type: "string", format: "uuid" },
            User: { $ref: "#/components/schemas/UserPublic" },
            Role: { $ref: "#/components/schemas/Role" },
          },
        },
      },
    },
    security: [],
  },
  apis: ["./swagger.paths.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
