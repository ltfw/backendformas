const express = require("express");
const { PrismaClient } = require("../generated/dbtrans");
const { Prisma } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient({ log: [ 'info', 'warn', 'error'] });

// GET all departments with pagination and optional search
router.get("/", async (req, res) => {
  const isAdmin = req.user.UserRoleCode === 'ADM';

  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.per_page) || 10;
    // const search = req.query.search?.trim() || '';
    const skip = (page - 1) * pageSize;
    // const searchQuery = `%${search}%`;
    // const userFilter = isAdmin ? '' : `WHERE NamaDept LIKE ${searchQuery} OR KodeDept LIKE ${searchQuery}`;

    const [departments, totalResult] = await Promise.all([
      prisma.$queryRaw`
        SELECT KodeDept, NamaDept FROM Departments
        ORDER BY KodeDept
        OFFSET ${skip} ROWS
        FETCH NEXT ${pageSize} ROWS ONLY;
      `,
      prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as total
        FROM Departments
      `)
    ]);

    const total = Number(totalResult[0]?.total || 0);

    res.json({
      data: departments,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch departments",errors:error });
  }
});

// GET a single department by ID (KodeDept)
router.get("/:id", async (req, res) => {
  try {
    const department = await prisma.departments.findUnique({
      where: {
        KodeDept: req.params.id,
      },
    });

    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    res.json(department);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch department" });
  }
});

module.exports = router;
