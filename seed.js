require("dotenv").config({ quiet: true });

const { DataTypes } = require("sequelize");
const {
  sequelize,
  User,
  Product,
  Category,
  OfficialPartner,
  Article,
  Education,
  Innovation,
  Job,
} = require("./src/models");

const categoryFixtures = [
  {
    slug: "choco",
    name: "Chocolate",
    description: "All chocolate products",
    isActive: true,
  },
  {
    slug: "matcha",
    name: "Matcha",
    description: "All matcha products",
    isActive: true,
  },
  {
    slug: "other",
    name: "Other",
    description: "Other products",
    isActive: true,
  },
];

const productFixtures = [
  {
    slug: "belgian-dark-72",
    categorySlug: "choco",
    type: "home-brand",
    title: "Belgian Dark Chocolate 72%",
    note: "Rich cocoa with a balanced finish",
    tag: "Dark Chocolate",
    img: "/uploads/products/1788492683010-w7b2cs.png",
    desc: "A rich dark chocolate made for baking, drinks, and everyday enjoyment.",
    isHighlight: true,
    isPublished: true,
  },
  {
    slug: "matcha-premium",
    categorySlug: "matcha",
    type: "general",
    title: "Premium Matcha",
    note: "Bright, smooth, and aromatic",
    tag: "Matcha",
    img: "/uploads/products/1788492930811-qbto3a.png",
    desc: "Premium matcha with a smooth profile for beverages and culinary recipes.",
    isHighlight: true,
    isPublished: true,
  },
];

const articleFixtures = [
  {
    slug: "tempering-guide",
    thumbnail: "/uploads/products/1788492947952-k1vxde.png",
    titleID: "Panduan Tempering Cokelat",
    titleEN: "A Practical Guide to Tempering Chocolate",
    titleZN: "巧克力调温实用指南",
    category: "Chocolate",
    excerpt: "Learn the basic steps for creating glossy chocolate with a satisfying snap.",
    keywords: "chocolate, tempering, baking",
    status: "published",
    published_date: "2026-01-15",
    contentID: "Tempering membantu menghasilkan cokelat yang mengilap dan memiliki tekstur yang renyah.",
    contentEN: "Tempering helps create chocolate with a glossy finish and a satisfying snap.",
    contentZN: "调温可以让巧克力拥有光泽和令人满意的脆感。",
  },
];

const educationFixtures = [
  {
    id: "barista-matcha",
    title: "Matcha Beverage Fundamentals",
    desc: "Learn the fundamentals of preparing consistent matcha beverages.",
    duration: "1 day",
    level: "Beginner",
    img: "/uploads/products/1788492930811-qbto3a.png",
    eyebrow: "NaturaFoods Academy",
    cta: "Explore course",
    link: "/education/barista-matcha",
    isPublished: true,
  },
];

const innovationFixtures = [
  {
    id: "cocoa-process",
    title: "Better Cocoa, Better Process",
    desc: "Explore process improvements that protect cocoa quality from source to finished product.",
    tag: "Cocoa",
    img: "/uploads/products/1788492683010-w7b2cs.png",
    eyebrow: "Innovation",
    link: "/innovations/cocoa-process",
    cta: "Learn more",
    isPublished: true,
  },
];

const partnerFixtures = [
  {
    id: "bensdorp",
    name: "Bensdorp",
    description: "A trusted partner for premium cocoa ingredients.",
    images: [
      "/uploads/partners/1788492930873-rhjo2e.png",
      "/uploads/products/1788492683010-w7b2cs.png",
    ],
    background: "/uploads/partners/1788492930873-rhjo2e.png",
    isPublished: true,
    link: "https://www.bensdorp.com",
    color: "#5C3825",
    order: 1,
  },
];

const jobFixtures = [
  {
    id: "sales-jkt",
    title: "Sales Development Associate",
    dept: "Commercial",
    loc: "Jakarta",
    type: "Full-time",
    desc: "Development fixture for testing the careers listing and admin workflow.",
    isPublished: false,
  },
];

async function upsertBy(model, where, values, transaction, options = {}) {
  const [record, created] = await model.findOrCreate({
    where,
    defaults: values,
    transaction,
  });

  if (!created && options.updateExisting !== false) {
    await record.update(values, { transaction });
  }

  return created;
}

async function migratePartnerImages() {
  const queryInterface = sequelize.getQueryInterface();
  if (!(await queryInterface.tableExists("official_partners"))) return;

  const table = await queryInterface.describeTable("official_partners");
  if (!table.images && table.image) {
    await sequelize.getQueryInterface().addColumn("official_partners", "images", {
      type: DataTypes.JSON,
      allowNull: true,
    });
    await sequelize.query(
      "UPDATE official_partners SET images = JSON_ARRAY(image) WHERE image IS NOT NULL AND image <> ''"
    );
  }
}

async function migrateProductCategories() {
  const queryInterface = sequelize.getQueryInterface();
  if (!(await queryInterface.tableExists("products"))) return;

  const table = await queryInterface.describeTable("products");

  // Add category_id column if missing
  if (!table.category_id) {
    await queryInterface.addColumn("products", "category_id", {
      type: DataTypes.UUID,
      allowNull: true,
    });
  }

  // Seed categories if table is empty or doesn't exist
  if (!(await queryInterface.tableExists("categories"))) {
    await sequelize.sync({ alter: true });
  }
  const catCount = await Category.count();
  if (catCount === 0) {
    for (const fixture of categoryFixtures) {
      await Category.findOrCreate({ where: { slug: fixture.slug }, defaults: fixture });
    }
  }

  // Migrate old cat values to category_id
  if (table.cat) {
    const categories = await Category.findAll();
    const catMap = {};
    categories.forEach((c) => (catMap[c.slug] = c.id));

    for (const [slug, catId] of Object.entries(catMap)) {
      await sequelize.query(
        "UPDATE products SET category_id = ? WHERE cat = ? AND category_id IS NULL",
        { replacements: [catId, slug] }
      );
    }

    // Set any remaining nulls to 'other'
    if (catMap.other) {
      await sequelize.query(
        "UPDATE products SET category_id = ? WHERE category_id IS NULL",
        { replacements: [catMap.other] }
      );
    }

    // Drop old cat column
    await queryInterface.removeColumn("products", "cat").catch(() => {});
  }
}

async function migrateBrandLogo() {
  const queryInterface = sequelize.getQueryInterface();
  if (!(await queryInterface.tableExists("brands"))) return;

  const table = await queryInterface.describeTable("brands");
  if (!table.logo) {
    await queryInterface.addColumn("brands", "logo", {
      type: DataTypes.STRING(500),
      allowNull: true,
    });
  }
}

async function migrateHomeBrandColumns() {
  const queryInterface = sequelize.getQueryInterface();
  if (!(await queryInterface.tableExists("home_brands"))) return;

  const table = await queryInterface.describeTable("home_brands");
  if (!table.brand_ids) {
    await queryInterface.addColumn("home_brands", "brand_ids", {
      type: DataTypes.JSON,
      allowNull: true,
    });
  }
}

async function migrateOfficialPartnerBrandIds() {
  const queryInterface = sequelize.getQueryInterface();
  if (!(await queryInterface.tableExists("official_partners"))) return;

  const table = await queryInterface.describeTable("official_partners");
  if (!table.brand_ids) {
    await queryInterface.addColumn("official_partners", "brand_ids", {
      type: DataTypes.JSON,
      allowNull: true,
    });
  }
}

async function migrateProductColumns() {
  const queryInterface = sequelize.getQueryInterface();
  if (!(await queryInterface.tableExists("products"))) return;

  const table = await queryInterface.describeTable("products");

  // sync() does not alter existing tables when DB_SYNC_ALTER=false
  if (!table.file) {
    await queryInterface.addColumn("products", "file", {
      type: DataTypes.STRING(500),
      allowNull: true,
    });
  }

  if (!table.brand_id) {
    await queryInterface.addColumn("products", "brand_id", {
      type: DataTypes.UUID,
      allowNull: true,
    });
  }
}

async function migrateSortIndexColumns() {
  const queryInterface = sequelize.getQueryInterface();
  const tables = [
    "products",
    "categories",
    "brands",
    "articles",
    "educations",
    "innovations",
    "jobs",
    "sales",
    "social_media",
    "home_brands",
  ];
  for (const tableName of tables) {
    if (!(await queryInterface.tableExists(tableName))) continue;
    const table = await queryInterface.describeTable(tableName);
    if (!table.sort_index) {
      await queryInterface.addColumn(tableName, "sort_index", {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    }
  }
}

async function seed() {
  const syncOptions = process.env.DB_SYNC_ALTER === "false" ? {} : { alter: true };
  await sequelize.authenticate();
  await migratePartnerImages();
  await migrateProductCategories();
  await migrateBrandLogo();
  await migrateHomeBrandColumns();
  await migrateOfficialPartnerBrandIds();
  await migrateProductColumns();
  await migrateSortIndexColumns();
  await sequelize.sync(syncOptions);

  if (process.env.DB_SYNC_ALTER !== "false") {
    await sequelize.getQueryInterface().removeColumn("official_partners", "image").catch(() => {});
  }

  const summary = {
    users: { created: 0, updated: 0 },
    categories: { created: 0, updated: 0 },
    products: { created: 0, updated: 0 },
    partners: { created: 0, updated: 0 },
    articles: { created: 0, updated: 0 },
    education: { created: 0, updated: 0 },
    innovations: { created: 0, updated: 0 },
    jobs: { created: 0, updated: 0 },
  };

  await sequelize.transaction(async (transaction) => {
    const seedPassword = process.env.SEED_ADMIN_PASSWORD;
    const admin = await User.findOne({
      where: { username: "admin" },
      transaction,
    });

    if (!admin) {
      await User.create(
        {
          name: "NaturaFoods Admin",
          email: "admin@example.com",
          username: "admin",
          role: "admin",
          password: seedPassword || "admin123",
        },
        { transaction }
      );
      summary.users.created += 1;
    } else {
      const values = {
        name: "NaturaFoods Admin",
        email: "admin@example.com",
        role: "admin",
      };
      if (seedPassword) values.password = seedPassword;
      await admin.update(values, { transaction });
      summary.users.updated += 1;
    }

    // Seed categories
    const categoryMap = {};
    for (const fixture of categoryFixtures) {
      const created = await upsertBy(Category, { slug: fixture.slug }, fixture, transaction);
      summary.categories[created ? "created" : "updated"] += 1;
      const cat = await Category.findOne({ where: { slug: fixture.slug }, transaction });
      categoryMap[fixture.slug] = cat.id;
    }

    // Seed products with categoryId
    for (const fixture of productFixtures) {
      const { categorySlug, ...productData } = fixture;
      productData.categoryId = categoryMap[categorySlug];
      const created = await upsertBy(Product, { slug: fixture.slug }, productData, transaction);
      summary.products[created ? "created" : "updated"] += 1;
    }

    for (const fixture of partnerFixtures) {
      const created = await upsertBy(OfficialPartner, { id: fixture.id }, fixture, transaction);
      summary.partners[created ? "created" : "updated"] += 1;
    }

    for (const fixture of articleFixtures) {
      const created = await upsertBy(Article, { slug: fixture.slug }, fixture, transaction);
      summary.articles[created ? "created" : "updated"] += 1;
    }

    for (const fixture of educationFixtures) {
      const created = await upsertBy(Education, { id: fixture.id }, fixture, transaction);
      summary.education[created ? "created" : "updated"] += 1;
    }

    for (const fixture of innovationFixtures) {
      const created = await upsertBy(Innovation, { id: fixture.id }, fixture, transaction);
      summary.innovations[created ? "created" : "updated"] += 1;
    }

    for (const fixture of jobFixtures) {
      const created = await upsertBy(Job, { id: fixture.id }, fixture, transaction);
      summary.jobs[created ? "created" : "updated"] += 1;
    }
  });

  console.log("Database seed completed.");
  for (const [model, counts] of Object.entries(summary)) {
    console.log(`- ${model}: ${counts.created} created, ${counts.updated} updated`);
  }
}

seed()
  .catch((error) => {
    console.error("Database seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });

module.exports = seed;
