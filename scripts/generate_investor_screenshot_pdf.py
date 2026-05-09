from __future__ import annotations

from pathlib import Path


PAGE_W = 595
PAGE_H = 842
MARGIN = 42


SECTIONS = [
    {
        "title": "Launch / Login",
        "file": "docs/investor-screenshots/01-launch-login.png",
        "caption": "Branded product entry point for NilaHub across web and app surfaces.",
        "proof": "The product has a polished entry experience and is not just a backend prototype.",
        "route": "src/components/Login.js, src/components/LaunchPage.js",
    },
    {
        "title": "Main Dashboard",
        "file": "docs/investor-screenshots/02-dashboard.png",
        "caption": "Unified dashboard connecting multiple high-frequency consumer and service modules.",
        "proof": "The super-app vision is visible in a single operating shell.",
        "route": "/dashboard, src/modules/Dashboard.js",
    },
    {
        "title": "Messaging Chat Window",
        "file": "docs/investor-screenshots/03-messaging-chat.png",
        "caption": "Real-time messaging interface with chat workflow, conversation history, and engagement surface.",
        "proof": "Core daily-use behavior and a strong engagement loop.",
        "route": "/messaging, src/modules/messaging/Messaging.js",
    },
    {
        "title": "Admin Dashboard",
        "file": "docs/investor-screenshots/04-admin-dashboard.png",
        "caption": "Admin dashboard for moderation, monitoring, and operational control.",
        "proof": "The product includes an operations layer, not just end-user screens.",
        "route": "/admin-dashboard, src/modules/admin/AdminDashboard.js",
    },
    {
        "title": "E-commerce Marketplace",
        "file": "docs/investor-screenshots/05-ecommerce-marketplace.png",
        "caption": "Marketplace browsing and product discovery flow within the NilaHub commerce layer.",
        "proof": "The platform supports transaction-oriented commerce experiences.",
        "route": "/ecommerce, src/modules/ecommerce/Ecommerce.js",
    },
    {
        "title": "Wallet / Payments",
        "file": "docs/investor-screenshots/06-wallet-payments.png",
        "caption": "Wallet and payment experience showing monetization infrastructure and transaction handling.",
        "proof": "There is a visible path to payments and monetization.",
        "route": "src/modules/ecommerce/Wallet.js, src/modules/ridesharing/components/payment/Wallet.js",
    },
    {
        "title": "Ride Booking",
        "file": "docs/investor-screenshots/07-ridesharing-booking.png",
        "caption": "Ride booking workflow with pickup, drop, payment method, and service logic.",
        "proof": "The product extends beyond messaging into service transactions.",
        "route": "/ridesharing, src/modules/ridesharing/RideSharing.js, src/modules/ridesharing/components/RideBooking.js",
    },
    {
        "title": "Live Ride Tracking",
        "file": "docs/investor-screenshots/08-ridesharing-tracking.png",
        "caption": "Live ride tracking interface with map-based trip visibility.",
        "proof": "Real-time operational UX and higher product sophistication.",
        "route": "src/modules/ridesharing/components/tracking/LiveMap.js",
    },
    {
        "title": "SOS / Safety",
        "file": "docs/investor-screenshots/09-sos-safety.png",
        "caption": "Emergency safety workflow with SOS escalation and trusted-contact support.",
        "proof": "Differentiated trust and safety capabilities.",
        "route": "/sosalert, src/modules/sos/SOSAlert.js, src/modules/ridesharing/components/safety/SOSEmergency.js",
    },
    {
        "title": "Reminder Workspace",
        "file": "docs/investor-screenshots/10-reminder-workspace.png",
        "caption": "Reminder and smart to-do workspace for repeat engagement and utility retention.",
        "proof": "The product includes recurring-use utility modules beyond one-time transactions.",
        "route": "/reminderalert, src/modules/reminderalert/ReminderAlert.js",
    },
    {
        "title": "Diary / AI Insights",
        "file": "docs/investor-screenshots/11-diary-ai.png",
        "caption": "Personal diary or AI insight workflow showing assistant-enabled product depth.",
        "proof": "The platform includes AI-assisted or high-retention personal utility features.",
        "route": "/diary, src/components/AIInsights.js, src/modules/personaldiary",
    },
    {
        "title": "Mobile App Shell",
        "file": "docs/investor-screenshots/12-mobile-app-shell.png",
        "caption": "Mobile app packaging view demonstrating Android-ready distribution and app portability.",
        "proof": "The platform is not limited to desktop web.",
        "route": "capacitor.config.json, android/",
    },
]


def esc(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def wrap(text: str, size: int, width: int) -> list[str]:
    max_chars = max(12, int(width / (size * 0.52)))
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


class Canvas:
    def __init__(self) -> None:
        self.ops: list[str] = []

    def text(self, x: int, y: int, size: int, text: str, font: str = "F1") -> None:
        self.ops.append(f"BT /{font} {size} Tf 1 0 0 1 {x} {y} Tm ({esc(text)}) Tj ET")

    def text_block(self, x: int, y: int, size: int, text: str, width: int, leading: int | None = None) -> int:
        leading = leading or int(size * 1.35)
        lines = wrap(text, size, width)
        for i, line in enumerate(lines):
            self.text(x, y - i * leading, size, line)
        return len(lines) * leading

    def rect(self, x: int, y: int, w: int, h: int, fill_gray: float | None = None) -> None:
        if fill_gray is not None:
            self.ops.append(f"q {fill_gray:.2f} g {x} {y} {w} {h} re f Q")
        self.ops.append(f"{x} {y} {w} {h} re S")

    def line(self, x1: int, y1: int, x2: int, y2: int) -> None:
        self.ops.append(f"{x1} {y1} m {x2} {y2} l S")

    def stream(self) -> bytes:
        return "\n".join(self.ops).encode("latin-1", "replace")


def build_cover() -> bytes:
    c = Canvas()
    c.rect(MARGIN, PAGE_H - 250, PAGE_W - MARGIN * 2, 190, fill_gray=0.96)
    c.text(MARGIN + 18, PAGE_H - 92, 28, "NilaHub - Investor Screenshot Appendix")
    c.text_block(
        MARGIN + 18,
        PAGE_H - 126,
        12,
        "Standalone PDF appendix for investor outreach. This version is ready to hold product screenshots and already includes the visual capture plan, file names, and investor-facing captions.",
        PAGE_W - MARGIN * 2 - 36,
    )
    c.text(MARGIN + 18, PAGE_H - 190, 11, "Prepared: May 9, 2026")
    c.text(MARGIN + 170, PAGE_H - 190, 11, "Status: Template ready, screenshots pending insertion")
    c.text(MARGIN + 18, PAGE_H - 235, 18, "Minimum Screenshot Set")

    y = PAGE_H - 270
    for idx, section in enumerate(SECTIONS, start=1):
        line = f"{idx:02d}. {section['title']} - {section['file']}"
        c.text(MARGIN + 6, y, 10, line)
        y -= 18
        if y < 85:
            break

    c.text(MARGIN, 62, 10, "Use docs/investor-screenshots/ for the final PNG files. Re-run this script any time you want a refreshed PDF.")
    return c.stream()


def draw_card(c: Canvas, x: int, top: int, w: int, h: int, num: int, section: dict[str, str]) -> None:
    y = top - h
    c.rect(x, y, w, h)
    c.rect(x + 12, top - 148, w - 24, 92, fill_gray=0.95)
    c.text(x + 14, top - 26, 15, f"{num}) {section['title']}")
    c.text(x + 14, top - 44, 9, "Placeholder")

    placeholder = section["file"]
    for i, line in enumerate(wrap(placeholder, 10, w - 42)):
        c.text(x + 28, top - 101 - i * 12, 10, line)

    cursor = top - 165
    c.text(x + 14, cursor, 9, "Caption")
    cursor -= 15
    cursor -= c.text_block(x + 14, cursor, 10, section["caption"], w - 28, 13)
    c.text(x + 14, cursor - 2, 9, "What This Proves")
    cursor -= 17
    cursor -= c.text_block(x + 14, cursor, 10, section["proof"], w - 28, 13)
    c.text(x + 14, cursor - 2, 9, "Route / Anchor")
    cursor -= 17
    c.text_block(x + 14, cursor, 9, section["route"], w - 28, 12)


def build_grid_page(start_index: int) -> bytes:
    c = Canvas()
    c.text(MARGIN, PAGE_H - 36, 20, "Screenshot Pages")
    c.text(MARGIN, PAGE_H - 54, 10, "Replace each placeholder with the final screenshot file before investor distribution.")

    left = MARGIN
    gap = 18
    card_w = int((PAGE_W - MARGIN * 2 - gap) / 2)
    card_h = 310
    top_positions = [PAGE_H - 86, PAGE_H - 414]
    idx = start_index
    for row, top in enumerate(top_positions):
        for col in range(2):
            if idx >= len(SECTIONS):
                break
            x = left + col * (card_w + gap)
            draw_card(c, x, top, card_w, card_h, idx + 1, SECTIONS[idx])
            idx += 1
    return c.stream()


def build_pdf(streams: list[bytes], output_path: Path) -> None:
    objects: list[bytes] = []

    def add_object(data: bytes) -> int:
        objects.append(data)
        return len(objects)

    font_obj = add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    pages_id_placeholder = len(objects) + 1
    add_object(b"")  # pages placeholder
    page_ids: list[int] = []

    for stream in streams:
        content_obj = add_object(b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream")
        page_obj = add_object(
            (
                f"<< /Type /Page /Parent {pages_id_placeholder} 0 R "
                f"/MediaBox [0 0 {PAGE_W} {PAGE_H}] "
                f"/Resources << /Font << /F1 {font_obj} 0 R >> >> "
                f"/Contents {content_obj} 0 R >>"
            ).encode("latin-1")
        )
        page_ids.append(page_obj)

    kids = " ".join(f"{pid} 0 R" for pid in page_ids)
    objects[pages_id_placeholder - 1] = f"<< /Type /Pages /Count {len(page_ids)} /Kids [{kids}] >>".encode("latin-1")
    catalog_obj = add_object(f"<< /Type /Catalog /Pages {pages_id_placeholder} 0 R >>".encode("latin-1"))

    pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{i} 0 obj\n".encode("latin-1"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_pos = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("latin-1"))
    pdf.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        pdf.extend(f"{off:010d} 00000 n \n".encode("latin-1"))
    pdf.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_obj} 0 R >>\n"
            f"startxref\n{xref_pos}\n%%EOF"
        ).encode("latin-1")
    )
    output_path.write_bytes(pdf)


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    output_path = repo_root / "INVESTOR_SCREENSHOT_APPENDIX.pdf"
    streams = [
        build_cover(),
        build_grid_page(0),
        build_grid_page(4),
        build_grid_page(8),
    ]
    build_pdf(streams, output_path)
    print(output_path)


if __name__ == "__main__":
    main()
