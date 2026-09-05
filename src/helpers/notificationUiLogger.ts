import colors from "colors";

interface BoxRow {
  label: string;
  value: string;
  valueColor?: (text: string) => string;
}

interface RenderBoxOptions {
  icon: string;
  title: string;
  channel: string;
  badge: {
    text: string;
    color: (text: string) => string;
  };
  rows: BoxRow[];
}

/**
 * Strip ANSI escape codes to calculate visual string length accurately
 */
const stripAnsi = (str: string): string => {
  return str.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, "");
};

/**
 * Calculate visual terminal display width taking emojis and ANSI into account
 */
const getVisibleWidth = (str: string): number => {
  const clean = stripAnsi(str);
  let width = 0;
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    // Emojis and miscellaneous symbols typically take 2 columns in terminal
    if (
      (code >= 0xd800 && code <= 0xdbff) || // High surrogate
      (code >= 0x2600 && code <= 0x27bf) ||
      (code >= 0x2300 && code <= 0x23ff)
    ) {
      width += 2;
      if (code >= 0xd800 && code <= 0xdbff) i++; // skip low surrogate
    } else {
      width += 1;
    }
  }
  return width;
};

/**
 * Wrap a string into chunks of max width
 */
const wrapText = (text: string, maxWidth: number): string[] => {
  if (!text) return [""];
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + (currentLine ? " " : "") + word).length <= maxWidth) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      if (word.length > maxWidth) {
        // Break extremely long single words
        let remaining = word;
        while (remaining.length > maxWidth) {
          lines.push(remaining.substring(0, maxWidth));
          remaining = remaining.substring(maxWidth);
        }
        currentLine = remaining;
      } else {
        currentLine = word;
      }
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [text];
};

/**
 * Render a gorgeous terminal card box
 */
const renderCardBox = (options: RenderBoxOptions): void => {
  const BOX_WIDTH = 76;
  const CONTENT_WIDTH = BOX_WIDTH - 4; // excluding '║ ' and ' ║'

  // Top border
  console.log(colors.gray("╔" + "═".repeat(BOX_WIDTH - 2) + "╗"));

  // Header line
  const badgePart = `[ ${options.badge.text} ]`;
  const badgeWidth = getVisibleWidth(badgePart);
  const maxTitleWidth = CONTENT_WIDTH - badgeWidth - 4;

  let rawTitle = ` ${options.icon}  ${options.channel.toUpperCase()} : ${options.title}`;
  if (getVisibleWidth(rawTitle) > maxTitleWidth) {
    while (
      getVisibleWidth(rawTitle) > maxTitleWidth - 3 &&
      rawTitle.length > 0
    ) {
      rawTitle = rawTitle.slice(0, -1);
    }
    rawTitle += "...";
  }

  const headerPadding = Math.max(
    0,
    CONTENT_WIDTH - getVisibleWidth(rawTitle) - badgeWidth,
  );

  console.log(
    colors.gray("║") +
      " " +
      colors.bold.white(rawTitle) +
      " ".repeat(headerPadding) +
      options.badge.color(badgePart) +
      " " +
      colors.gray("║"),
  );

  // Separator
  console.log(colors.gray("╠" + "═".repeat(BOX_WIDTH - 2) + "╣"));

  // Rows
  const LABEL_WIDTH = 13;
  const VALUE_WIDTH = CONTENT_WIDTH - LABEL_WIDTH - 3; // ' : ' is 3 chars

  for (const row of options.rows) {
    const rawVal = row.value || "N/A";
    const wrappedLines = wrapText(rawVal, VALUE_WIDTH);

    wrappedLines.forEach((line, index) => {
      let formattedLine = "";
      if (index === 0) {
        const labelText = row.label.padEnd(LABEL_WIDTH);
        const coloredVal = row.valueColor ? row.valueColor(line) : line;
        const visibleLen =
          getVisibleWidth(labelText) + 3 + getVisibleWidth(line);
        const padding = Math.max(0, CONTENT_WIDTH - visibleLen);
        formattedLine =
          colors.gray("║") +
          " " +
          colors.cyan(labelText) +
          colors.gray(" : ") +
          coloredVal +
          " ".repeat(padding) +
          " " +
          colors.gray("║");
      } else {
        const coloredVal = row.valueColor ? row.valueColor(line) : line;
        const visibleLen = LABEL_WIDTH + 3 + getVisibleWidth(line);
        const padding = Math.max(0, CONTENT_WIDTH - visibleLen);
        formattedLine =
          colors.gray("║") +
          " " +
          " ".repeat(LABEL_WIDTH + 3) +
          coloredVal +
          " ".repeat(padding) +
          " " +
          colors.gray("║");
      }
      console.log(formattedLine);
    });
  }

  // Timestamp line
  const timeStr = new Date().toLocaleTimeString();
  const timeLabel = "Timestamp".padEnd(LABEL_WIDTH);
  const timeVisible = LABEL_WIDTH + 3 + getVisibleWidth(timeStr);
  const timePadding = Math.max(0, CONTENT_WIDTH - timeVisible);
  console.log(
    colors.gray("║") +
      " " +
      colors.gray(timeLabel) +
      colors.gray(" : ") +
      colors.gray(timeStr) +
      " ".repeat(timePadding) +
      " " +
      colors.gray("║"),
  );

  // Bottom border
  console.log(colors.gray("╚" + "═".repeat(BOX_WIDTH - 2) + "╝"));
};

/**
 * PUSH NOTIFICATION LOGGER
 */
export interface PushLogOptions {
  status: "SUCCESS" | "SKIPPED" | "FAILED";
  recipients: string | string[];
  title: string;
  body: string;
  type?: string;
  tokensCount?: number;
  data?: Record<string, any>;
  reason?: string;
  error?: any;
}

const logPushNotification = (opts: PushLogOptions): void => {
  const recipientList = Array.isArray(opts.recipients)
    ? opts.recipients.join(", ")
    : opts.recipients || "Unknown";

  let badgeColor = colors.green.bold;
  let badgeText = "DELIVERED";
  let statusVal = `Sent successfully via Firebase FCM`;

  if (opts.status === "SKIPPED") {
    badgeColor = colors.yellow.bold;
    badgeText = "SKIPPED";
    statusVal = opts.reason || "No registered FCM device token found in DB";
  } else if (opts.status === "FAILED") {
    badgeColor = colors.red.bold;
    badgeText = "FAILED";
    statusVal =
      opts.reason ||
      opts.error?.message ||
      opts.error?.code ||
      (typeof opts.error === "string" ? opts.error : null) ||
      "FCM Delivery Error";
  } else if (opts.tokensCount !== undefined) {
    statusVal = `Delivered to ${opts.tokensCount} device(s)`;
  }

  const rows: BoxRow[] = [
    {
      label: "Status",
      value: statusVal,
      valueColor:
        opts.status === "SUCCESS"
          ? colors.green
          : opts.status === "SKIPPED"
            ? colors.yellow
            : colors.red,
    },
    {
      label: "Recipient(s)",
      value: recipientList,
      valueColor: colors.white,
    },
    {
      label: "Title",
      value: opts.title || "(No title)",
      valueColor: colors.bold.white,
    },
    {
      label: "Body",
      value: opts.body || "(No message body)",
      valueColor: colors.white,
    },
  ];

  if (opts.type) {
    rows.push({
      label: "Category",
      value: opts.type,
      valueColor: colors.magenta,
    });
  }

  if (opts.data && Object.keys(opts.data).length > 0) {
    const metaParts = Object.entries(opts.data)
      .filter(([_, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${k}=${v}`)
      .join(" | ");
    if (metaParts) {
      rows.push({
        label: "Metadata",
        value: metaParts,
        valueColor: colors.cyan,
      });
    }
  }

  renderCardBox({
    icon: "🔔",
    channel: "Push Notification (FCM)",
    title: opts.title ? `"${opts.title}"` : "Notification",
    badge: {
      text: badgeText,
      color: badgeColor,
    },
    rows,
  });
};

/**
 * SOCKET.IO EVENT LOGGER
 */
export interface SocketLogOptions {
  status: "DELIVERED" | "OFFLINE" | "BROADCAST";
  event: string;
  recipient?: string | string[];
  data?: any;
  note?: string;
}

// High-frequency ping events to log compactly so the terminal isn't flooded
const HIGH_FREQUENCY_EVENTS = new Set([
  "driver-location-updated",
  "user-location-updated",
  "nearby-driver-location-updated",
]);

const logSocketEvent = (opts: SocketLogOptions): void => {
  const recipientStr = Array.isArray(opts.recipient)
    ? opts.recipient.join(", ")
    : opts.recipient || "All connected clients";

  // Compact log for high frequency tracking updates
  if (HIGH_FREQUENCY_EVENTS.has(opts.event)) {
    const statusIcon = opts.status === "DELIVERED" ? "🟢" : "⚪";
    console.log(
      colors.gray(
        `📍 [SOCKET] ${statusIcon} ${opts.event} -> User: ${recipientStr} (${opts.status})`,
      ),
    );
    return;
  }

  let badgeColor = colors.green.bold;
  let badgeText = "DELIVERED";
  let statusText = "User Online & Socket Connected";

  if (opts.status === "OFFLINE") {
    badgeColor = colors.yellow.bold;
    badgeText = "OFFLINE";
    statusText = opts.note || "User not connected to Socket.IO";
  } else if (opts.status === "BROADCAST") {
    badgeColor = colors.cyan.bold;
    badgeText = "BROADCAST";
    statusText = "Broadcast to room / all admins";
  }

  let preview = "";
  if (opts.data) {
    if (typeof opts.data === "string") {
      preview = opts.data;
    } else if (opts.data.title || opts.data.text || opts.data.message) {
      preview = [opts.data.title, opts.data.text || opts.data.message]
        .filter(Boolean)
        .join(" - ");
    } else if (opts.data.reportNumber || opts.data.rideId || opts.data.status) {
      preview = Object.entries(opts.data)
        .slice(0, 4)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
    } else {
      try {
        preview = JSON.stringify(opts.data).substring(0, 120);
      } catch {
        preview = "[Complex Object]";
      }
    }
  }

  const rows: BoxRow[] = [
    {
      label: "Status",
      value: statusText,
      valueColor:
        opts.status === "DELIVERED"
          ? colors.green
          : opts.status === "BROADCAST"
            ? colors.cyan
            : colors.yellow,
    },
    {
      label: "Event",
      value: opts.event,
      valueColor: colors.magenta.bold,
    },
    {
      label: "Recipient",
      value: recipientStr,
      valueColor: colors.white,
    },
  ];

  if (preview) {
    rows.push({
      label: "Payload",
      value: preview,
      valueColor: colors.white,
    });
  }

  renderCardBox({
    icon: "⚡",
    channel: "Socket.IO Event",
    title: opts.event,
    badge: {
      text: badgeText,
      color: badgeColor,
    },
    rows,
  });
};

/**
 * EMAIL LOGGER
 */
export interface EmailLogOptions {
  status: "SUCCESS" | "FAILED";
  to: string;
  subject: string;
  from?: string;
  messageId?: string;
  error?: any;
}

const logEmail = (opts: EmailLogOptions): void => {
  let badgeColor = colors.green.bold;
  let badgeText = "SENT";
  let statusText = "Accepted by SMTP Server";

  if (opts.status === "FAILED") {
    badgeColor = colors.red.bold;
    badgeText = "FAILED";
    statusText =
      opts.error?.message || String(opts.error || "Email dispatch failed");
  } else if (opts.messageId) {
    statusText = `Accepted (ID: ${opts.messageId})`;
  }

  const rows: BoxRow[] = [
    {
      label: "Status",
      value: statusText,
      valueColor: opts.status === "SUCCESS" ? colors.green : colors.red,
    },
    {
      label: "To",
      value: opts.to,
      valueColor: colors.bold.white,
    },
    {
      label: "Subject",
      value: opts.subject,
      valueColor: colors.white,
    },
  ];

  if (opts.from) {
    rows.push({
      label: "From",
      value: opts.from,
      valueColor: colors.gray,
    });
  }

  renderCardBox({
    icon: "✉️",
    channel: "Email Dispatch",
    title: opts.subject || "Email",
    badge: {
      text: badgeText,
      color: badgeColor,
    },
    rows,
  });
};

export const notificationUiLogger = {
  logPushNotification,
  logSocketEvent,
  logEmail,
};
