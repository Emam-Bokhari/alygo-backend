import mongoose from "mongoose";
import config from "../config";
import { Permission } from "../app/modules/permission/permission.model";
import { Role } from "../app/modules/role/role.model";
import { AuditLog } from "../app/modules/auditLog/auditLog.model";
import { User } from "../app/modules/user/user.model";
import { RBACService } from "../app/modules/rbac/rbac.service";
import { requirePermission } from "../app/middlewares/requirePermission";
import redisClient from "../shared/redisClient";
import { USER_ROLES } from "../enums/user";

// Helper assertions
const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`PASS: ${message}`);
};

const assertThrows = async (
  fn: () => Promise<any>,
  expectedMessage: string,
  message: string,
) => {
  try {
    await fn();
    throw new Error(
      `Expected error containing "${expectedMessage}", but no error was thrown`,
    );
  } catch (err: any) {
    if (err.message && err.message.includes(expectedMessage)) {
      console.log(`PASS: ${message}`);
    } else {
      throw new Error(
        `Assertion Failed: ${message}. Expected error containing "${expectedMessage}", got "${err.message}"`,
      );
    }
  }
};

async function runTests() {
  try {
    console.log("Connecting to database: ", config.database_url);
    await mongoose.connect(config.database_url as string);
    console.log("Database connected.");

    // Clean test data before starting
    console.log("Cleaning up previous test data...");
    await Role.deleteMany({ slug: { $regex: /^test-/ } });
    await AuditLog.deleteMany({ action: { $regex: /_TEST$/ } });

    // 1. Verify Permission Seeder
    console.log("\n--- Test 1: Permission Seeding ---");
    await RBACService.seedPermissions();
    const count = await Permission.countDocuments();
    assert(count > 0, `Permissions exist in database (Count: ${count})`);

    const faqPerm = await Permission.findOne({ key: "faq" });
    assert(!!faqPerm, "faq permission seeded correctly");

    // 2. Test Role Creation and Duplication Guards
    console.log("\n--- Test 2: Role Creation & Validations ---");
    const adminUser = await User.findOne({});
    const creatorId = adminUser
      ? adminUser._id.toString()
      : new mongoose.Types.ObjectId().toString();

    const createdRole = await RBACService.createRole(
      {
        name: "Test Manager Role",
        description: "A test role for managers",
        permissions: [faqPerm!._id.toString()],
        status: "active",
      },
      creatorId,
    );

    assert(createdRole.name === "Test Manager Role", "Role name matches");
    assert(
      createdRole.slug === "test-manager-role",
      "Role slug generated and matches",
    );

    // Test Duplication Guard
    await assertThrows(
      () =>
        RBACService.createRole(
          {
            name: "Test Manager Role",
            description: "A duplicate role",
            permissions: [faqPerm!._id.toString()],
          },
          creatorId,
        ),
      "Role with this name or slug already exists",
      "Should prevent creating role with duplicate name",
    );

    // Test Inactive Permission Assignment Guard
    const inactivePermission = await Permission.create({
      name: "Test Inactive Perm",
      key: "test.inactive",
      module: "Test",
      group: "Test",
      description: "Inactive",
      status: "inactive",
    });

    await assertThrows(
      () =>
        RBACService.createRole(
          {
            name: "Test Invalid Role",
            permissions: [inactivePermission._id.toString()],
          },
          creatorId,
        ),
      "One or more permissions are inactive or invalid",
      "Should prevent creating role with inactive permissions",
    );

    // Clean up temporary inactive permission
    await Permission.findByIdAndDelete(inactivePermission._id);

    // 3. Test Redis Caching & Invalidation
    console.log("\n--- Test 3: Redis Cache ---");
    if (!redisClient.isOpen) {
      console.log("Redis client is not open. Skipping Redis tests.");
    } else {
      const cacheKey = `role_permissions:${createdRole._id.toString()}`;
      await redisClient.del(cacheKey);

      // Verify DB fetch & cache set
      const permKeys = await RBACService.getRolePermissions(createdRole._id);
      assert(permKeys.includes("faq"), "Active permissions fetched");

      const cached = await redisClient.get(cacheKey);
      assert(!!cached, "Permissions saved to Redis cache");
      assert(JSON.parse(cached!).includes("faq"), "Cached permissions match");

      // Verify clear cache on role update
      await RBACService.updateRole(
        createdRole._id.toString(),
        {
          description: "Updated description",
        },
        creatorId,
        true,
      );

      const cachedAfterUpdate = await redisClient.get(cacheKey);
      assert(!cachedAfterUpdate, "Redis cache cleared on role update");
    }

    // 4. Test requirePermission Middleware
    console.log("\n--- Test 4: requirePermission Middleware ---");

    // 4.1 Super Admin Bypass
    let nextCalled = false;
    const reqSuperAdmin = {
      user: {
        id: creatorId,
        role: USER_ROLES.SUPER_ADMIN,
        email: "superadmin@test.com",
      },
    } as any;

    const res = {} as any;
    const next = () => {
      nextCalled = true;
    };

    const middlewareFaqCreate = requirePermission("faq");
    await middlewareFaqCreate(reqSuperAdmin, res, next);
    assert(nextCalled, "Super Admin bypasses permission checks immediately");

    // 4.2 Standard Admin Authorized Check
    nextCalled = false;
    const reqAdmin = {
      user: {
        id: creatorId,
        role: USER_ROLES.ADMIN,
        roleId: createdRole._id.toString(),
        email: "admin@test.com",
      },
      originalUrl: "/test-url",
      method: "POST",
    } as any;

    await middlewareFaqCreate(reqAdmin, res, next);
    assert(nextCalled, "Authorized admin passes requirePermission check");

    // 4.3 Standard Admin Unauthorized Check (Forbidden)
    let errorThrown: any = null;
    const nextWithError = (err: any) => {
      errorThrown = err;
    };
    const middlewareRideCreate = requirePermission("ride");

    await middlewareRideCreate(reqAdmin, res, nextWithError);
    assert(
      !!errorThrown,
      "Unauthorized admin fails requirePermission check with error",
    );
    assert(
      errorThrown.statusCode === 403,
      "Access failure returns 403 Forbidden",
    );

    // 5. Verify Audit Logs
    console.log("\n--- Test 5: Audit Logs ---");
    const roleCreatedLog = await AuditLog.findOne({ action: "ROLE_CREATED" });
    assert(!!roleCreatedLog, "ROLE_CREATED audit log exists");

    const failureLog = await AuditLog.findOne({
      action: "PERMISSION_CHECK_FAILURE",
    });
    assert(!!failureLog, "PERMISSION_CHECK_FAILURE audit log exists");
    assert(
      failureLog!.details.requestedPermissions.includes("ride"),
      "Logged incorrect permission target",
    );

    // Clean up test data
    console.log("\nCleaning up test data...");
    await Role.findByIdAndDelete(createdRole._id);
    await AuditLog.deleteMany({ action: { $regex: /_TEST$/ } }); // keep real ones or delete
    console.log("Cleanup complete.");

    console.log("\n==================================");
    console.log("ALL RBAC TESTS COMPLETED SUCCESSFULLY!");
    console.log("==================================");
  } catch (err) {
    console.error("Test execution failed with error: ", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    if (redisClient.isOpen) {
      await redisClient.disconnect();
    }
    process.exit(0);
  }
}

runTests();
