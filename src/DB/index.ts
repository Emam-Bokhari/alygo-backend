import colors from "colors";
import { User } from "../app/modules/user/user.model";
import config from "../config";
import { USER_ROLES } from "../enums/user";
import { logger } from "../shared/logger";
import { AiKnowledge } from "../app/modules/aiKnowledge/aiKnowledge.model";
import { SystemConfiguration } from "../app/modules/systemConfiguration/systemConfiguration.model";
import { AiKnowledgeModule } from "../app/modules/aiKnowledge/aiKnowledge.constant";

const superUser = {
  name: "Super Admin",
  role: USER_ROLES.SUPER_ADMIN,
  email: config.admin.email,
  password: config.admin.password,
  verified: true,
};

const runAiSupportMigrations = async () => {
  try {
    // 1. Migrate any legacy "draft" knowledge documents to "published"
    const draftUpdateResult = await AiKnowledge.updateMany(
      { status: "draft" as any },
      { $set: { status: "published" } },
    );
    if (draftUpdateResult.modifiedCount > 0) {
      logger.info(
        colors.yellow(
          `✔ Migrated ${draftUpdateResult.modifiedCount} legacy "draft" knowledge articles to "published".`,
        ),
      );
    }

    // 2. Ensure all modules in AiKnowledgeModule are in system configuration's enabledModules
    const allModules = Object.values(AiKnowledgeModule);
    const sysConfig = await SystemConfiguration.findOne();
    if (sysConfig && sysConfig.aiSupport) {
      const existingModules = sysConfig.aiSupport.enabledModules || [];
      const missingModules = allModules.filter(
        (m) => !existingModules.includes(m),
      );
      if (missingModules.length > 0) {
        sysConfig.aiSupport.enabledModules = [
          ...existingModules,
          ...missingModules,
        ];
        await sysConfig.save();
        logger.info(
          colors.yellow(
            `✔ Added missing modules to enabledModules: ${missingModules.join(", ")}`,
          ),
        );
      }
    }
  } catch (error) {
    logger.error("Failed to run AI support migrations:", error);
  }
};

const seedSuperAdmin = async () => {
  const existingUser = await User.findOne({
    email: config.admin.email,
  });

  if (!existingUser) {
    await User.create(superUser);
    logger.info(colors.green("✔ Super admin created successfully!"));
  } else if (existingUser.role !== USER_ROLES.SUPER_ADMIN) {
    existingUser.role = USER_ROLES.SUPER_ADMIN;
    existingUser.verified = true;
    await existingUser.save();
    logger.info(colors.yellow("✔ Existing user promoted to Super Admin!"));
  } else {
    logger.info(colors.cyan("✔ Super Admin already exists."));
  }

  // Run AI Support migrations
  await runAiSupportMigrations();
};

export default seedSuperAdmin;
