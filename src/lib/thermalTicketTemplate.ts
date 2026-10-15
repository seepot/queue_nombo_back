export interface TicketTemplateSettings {
  paperWidth: "58mm" | "80mm";
  headerTitle: string;
  headerSubtitle: string;
  showBranchName: boolean;
  showServiceCategory: boolean;
  showWaitingCount: boolean;
  showEstimatedWaitTime: boolean;
  showQrCode: boolean;
  showFooterMessage: boolean;
  footerMessage: string;
  footerSubMessage: string;
  autoPrintCut: boolean;
}

export const DEFAULT_TEMPLATE_SETTINGS: TicketTemplateSettings = {
  paperWidth: "80mm",
  headerTitle: "JABATAN PENGANGKUTAN JALAN",
  headerSubtitle: "SISTEM GILIRAN JPJeQ",
  showBranchName: true,
  showServiceCategory: true,
  showWaitingCount: true,
  showEstimatedWaitTime: true,
  showQrCode: true,
  showFooterMessage: true,
  footerMessage: "Sila bersedia dengan dokumen MyKad & geran asal.",
  footerSubMessage: "Terima kasih atas kesabaran anda.",
  autoPrintCut: true,
};

export interface TicketPrintData {
  noTiket: number | string;
  keterangan: string;
  namaCawangan?: string;
  bilMenunggu?: number;
  anggaranMinit?: number;
  tarikhStr?: string;
  transid?: string;
  sesi?: number;
  isPriority?: boolean;
}

export function generateThermalTicketHtml(
  data: TicketPrintData,
  settings: TicketTemplateSettings = DEFAULT_TEMPLATE_SETTINGS
): string {
  const widthMm = settings.paperWidth === "58mm" ? "54mm" : "76mm";
  const numFontSize = settings.paperWidth === "58mm" ? "56px" : "68px";

  const qrUrl = data.transid
    ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
        `JPJEQ:${data.transid}`
      )}`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Tiket #${data.noTiket} - JPJeQ</title>
  <style>
    @page {
      margin: 0;
      size: ${settings.paperWidth} auto;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      margin: 0 auto;
      padding: 6mm 3mm;
      width: ${widthMm};
      max-width: 100%;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace;
      color: #000;
      background: #fff;
      text-align: center;
      line-height: 1.25;
    }
    .header-title {
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.5px;
      margin: 0;
      text-transform: uppercase;
    }
    .header-sub {
      font-size: 10px;
      font-weight: 700;
      color: #333;
      margin: 2px 0 0 0;
      letter-spacing: 1px;
    }
    .branch-name {
      font-size: 11px;
      font-weight: 800;
      margin: 4px 0 0 0;
      text-transform: uppercase;
    }
    .divider {
      border-top: 1.5px dashed #000;
      margin: 6px 0;
    }
    .service-title {
      font-size: 13px;
      font-weight: 800;
      margin: 4px 0;
      text-transform: uppercase;
      padding: 2px 4px;
      background: #eee;
      border-radius: 4px;
      display: inline-block;
    }
    .ticket-number {
      font-size: ${numFontSize};
      font-weight: 900;
      margin: 4px 0;
      letter-spacing: 2px;
      font-family: "Courier New", Courier, monospace;
      line-height: 1;
    }
    .queue-info {
      font-size: 11px;
      font-weight: 700;
      margin: 4px 0;
    }
    .est-time {
      font-size: 10px;
      font-weight: 600;
      color: #333;
      margin: 2px 0 6px 0;
    }
    .qr-container {
      margin: 6px 0;
    }
    .qr-img {
      width: 90px;
      height: 90px;
      display: inline-block;
    }
    .qr-caption {
      font-size: 8.5px;
      color: #555;
      margin-top: 2px;
    }
    .timestamp {
      font-size: 9.5px;
      color: #333;
      font-weight: 600;
      margin: 6px 0 2px 0;
    }
    .footer-msg {
      font-size: 9px;
      color: #222;
      margin: 4px 0 0 0;
      line-height: 1.3;
    }
    .footer-sub {
      font-size: 8px;
      color: #555;
      margin: 2px 0 0 0;
    }
    .cut-line {
      margin-top: 10px;
      border-top: 1px dotted #888;
      padding-top: 2px;
      font-size: 8px;
      color: #888;
    }
  </style>
</head>
<body>
  <div class="header-title">${settings.headerTitle}</div>
  <div class="header-sub">${settings.headerSubtitle}</div>
  ${
    settings.showBranchName && data.namaCawangan
      ? `<div class="branch-name">${data.namaCawangan}</div>`
      : ""
  }

  <div class="divider"></div>

  ${
    settings.showServiceCategory
      ? `<div class="service-title">${data.keterangan}</div>`
      : ""
  }

  ${
    data.isPriority
      ? `<div style="margin: 3px 0; padding: 2px 4px; background: #000; color: #fff; font-size: 10px; font-weight: 900; letter-spacing: 0.5px; border-radius: 3px;">
          ★ KEUTAMAAN / PRIORITY ★
         </div>`
      : ""
  }

  <div class="ticket-number">${data.noTiket}</div>

  ${
    settings.showWaitingCount
      ? `<div class="queue-info">Baki Menunggu: <strong>${
          data.bilMenunggu !== undefined ? data.bilMenunggu : 0
        } Pelanggan</strong></div>`
      : ""
  }

  ${
    settings.showEstimatedWaitTime && data.anggaranMinit !== undefined
      ? `<div class="est-time">Anggaran Masa: <strong>~${data.anggaranMinit} minit</strong></div>`
      : ""
  }

  ${
    settings.showQrCode && qrUrl
      ? `<div class="qr-container">
          <img src="${qrUrl}" alt="QR" class="qr-img" />
          <div class="qr-caption">Imbas untuk semak status giliran di telefon</div>
        </div>`
      : ""
  }

  <div class="divider"></div>

  <div class="timestamp">${data.tarikhStr || new Date().toLocaleString("ms-MY")}</div>

  ${
    settings.showFooterMessage
      ? `<div class="footer-msg">${settings.footerMessage}</div>
         <div class="footer-sub">${settings.footerSubMessage}</div>`
      : ""
  }

  ${settings.autoPrintCut ? `<div class="cut-line">-- GUNTING DI SINI --</div>` : ""}

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;
}
