"""Captura screenshots do site em execução para o PDF de portfólio."""
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "portfolio" / "screenshots"
BASE = "http://localhost:8081"

VIEWPORT_DESKTOP = {"width": 1440, "height": 900}
VIEWPORT_MOBILE = {"width": 390, "height": 844}


def wait_images(page: Page, extra_ms: int = 800) -> None:
    page.evaluate("""async () => {
        const imgs = [...document.images];
        await Promise.all(imgs.map((img) => {
            if (img.complete && img.naturalWidth > 0) return Promise.resolve();
            return new Promise((resolve) => {
                const done = () => resolve();
                img.addEventListener('load', done, { once: true });
                img.addEventListener('error', done, { once: true });
                setTimeout(done, 6000);
            });
        }));
    }""")
    page.wait_for_timeout(extra_ms)


def wait_visible_images(page: Page, selector: str, extra_ms: int = 800) -> None:
    page.evaluate("""async (sel) => {
        const root = document.querySelector(sel);
        if (!root) return;
        const imgs = [...root.querySelectorAll('img')];
        await Promise.all(imgs.map((img) => {
            if (img.complete && img.naturalWidth > 0) return Promise.resolve();
            return new Promise((resolve) => {
                const done = () => resolve();
                img.addEventListener('load', done, { once: true });
                img.addEventListener('error', done, { once: true });
                setTimeout(done, 8000);
            });
        }));
    }""", selector)
    page.wait_for_timeout(extra_ms)


def goto_and_settle(page: Page, url: str) -> None:
    page.goto(url, wait_until="load", timeout=60000)
    page.wait_for_load_state("domcontentloaded")
    wait_images(page, 1500)


def center_element(page: Page, selector: str | None = None, index: int | None = None) -> None:
    page.evaluate("""([sel, idx]) => {
        let el;
        if (idx !== null) {
            el = document.querySelectorAll('.photo-window')[idx];
        } else if (sel) {
            el = document.querySelector(sel);
        }
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const target = window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2;
        window.scrollTo({ top: Math.max(0, target), behavior: 'instant' });
        window.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('resize'));
    }""", [selector, index])
    page.wait_for_timeout(700)


def capture_viewport(page: Page, name: str) -> None:
    path = OUT / f"{name}.png"
    page.screenshot(path=str(path), full_page=False)
    print(f"  {path.name}")


def capture_full(page: Page, name: str) -> None:
    wait_images(page, 500)
    path = OUT / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
    print(f"  {path.name}")


def capture_section(page: Page, name: str, selector: str) -> None:
    el = page.locator(selector).first
    el.wait_for(state="visible", timeout=15000)
    center_element(page, selector)
    wait_visible_images(page, selector, 1000)
    path = OUT / f"{name}.png"
    el.screenshot(path=str(path))
    print(f"  {path.name}")


def capture_parallax_window(
    page: Page,
    name: str,
    *,
    window_selector: str | None = None,
    window_index: int | None = None,
    wallpaper_selector: str | None = None,
) -> None:
    if window_selector:
        page.locator(window_selector).first.wait_for(state="attached", timeout=15000)
        center_element(page, window_selector)
    elif window_index is not None:
        page.locator(".photo-window").nth(window_index).wait_for(state="attached", timeout=15000)
        center_element(page, index=window_index)
    page.wait_for_timeout(500)
    if wallpaper_selector:
        page.wait_for_function(
            """(sel) => {
                const el = document.querySelector(sel);
                if (!el) return false;
                const img = el.querySelector('img');
                if (!img || !img.complete || img.naturalWidth === 0) return false;
                if (el.classList.contains('is-visible')) return true;
                if (el.classList.contains('page-wallpaper--vivaro')) {
                    return document.body.classList.contains('is-vivaro-scene');
                }
                const style = window.getComputedStyle(el);
                return parseFloat(style.opacity) > 0.5;
            }""",
            arg=wallpaper_selector,
            timeout=12000,
        )
    else:
        page.wait_for_function("""() => {
            const el = document.querySelector('.page-wallpaper:not(.page-wallpaper--vivaro) img');
            return el && el.complete && el.naturalWidth > 0;
        }""", timeout=12000)
        page.wait_for_function(
            "() => !document.body.classList.contains('is-vivaro-scene')",
            timeout=5000,
        )
    wait_images(page, 1800)
    capture_viewport(page, name)


def mask_pix_for_portfolio(page: Page) -> None:
    """Oculta QR Code e chave Pix nos screenshots do portfólio."""
    page.evaluate("""() => {
        document.querySelectorAll('.pix-qr-frame img').forEach((img) => {
            img.style.filter = 'blur(16px)';
        });
        document.querySelectorAll('.pix-meta .pix-row').forEach((row) => {
            const label = row.querySelector('span');
            const value = row.querySelector('strong');
            if (label && value && /chave pix/i.test(label.textContent)) {
                value.style.filter = 'blur(10px)';
                value.style.userSelect = 'none';
            }
        });
    }""")
    page.wait_for_timeout(200)


def wait_gifts(page: Page) -> None:
    page.wait_for_selector("#giftsGrid .gift-card", timeout=20000)
    wait_visible_images(page, "#presentes", 800)


def wait_map(page: Page) -> None:
    page.wait_for_selector("#placesList .place-card", timeout=20000)
    page.wait_for_timeout(1500)
    wait_visible_images(page, "#hospedagem", 1000)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport=VIEWPORT_DESKTOP, device_scale_factor=2)
        page = ctx.new_page()
        page.set_default_timeout(20000)

        # ── Home ─────────────────────────────────────────────
        print("Home (desktop):")
        goto_and_settle(page, f"{BASE}/")
        mask_pix_for_portfolio(page)

        capture_full(page, "home-full")
        capture_section(page, "home-hero", "#home")

        capture_parallax_window(
            page, "home-parallax-1", window_index=0,
            wallpaper_selector=".page-wallpaper:not(.page-wallpaper--vivaro)",
        )

        capture_section(page, "home-casal", "#casal")

        capture_parallax_window(
            page, "home-parallax-2", window_index=1,
            wallpaper_selector=".page-wallpaper:not(.page-wallpaper--vivaro)",
        )

        capture_section(page, "home-recepcao", "#recepcao")

        capture_parallax_window(
            page, "home-parallax-vivaro",
            window_selector='[data-scene="vivaro"]',
            wallpaper_selector=".page-wallpaper--vivaro",
        )

        center_element(page, "#presentes")
        wait_gifts(page)
        capture_section(page, "home-presentes", "#presentes")

        center_element(page, "#hospedagem")
        wait_map(page)
        capture_section(page, "home-hospedagem", "#hospedagem")

        # ── Convite ──────────────────────────────────────────
        print("Convite (desktop):")
        goto_and_settle(page, f"{BASE}/convite/")
        page.wait_for_timeout(1000)
        capture_viewport(page, "convite-cover")

        page.evaluate("""() => {
            const ws = document.getElementById('welcomeScreen');
            const mc = document.getElementById('mainContent');
            if (ws) ws.style.display = 'none';
            if (mc) { mc.style.opacity = '1'; mc.style.transition = 'none'; }
        }""")
        wait_images(page, 1500)
        capture_full(page, "convite-full")

        # ── Padrinhos ────────────────────────────────────────
        print("Padrinhos (desktop):")
        goto_and_settle(page, f"{BASE}/padrinhos/")

        capture_full(page, "padrinhos-full")
        capture_section(page, "padrinhos-hero", "#home")
        capture_section(page, "padrinhos-mensagem", "#mensagem")
        capture_section(page, "padrinhos-traje-feminino", "#traje-feminino")

        capture_parallax_window(
            page, "padrinhos-parallax-madrinhas",
            window_selector='[data-scene="madrinhas"]',
            wallpaper_selector="#wallpaperMadrinhas",
        )

        capture_section(page, "padrinhos-traje-masculino", "#traje-masculino")

        capture_parallax_window(
            page, "padrinhos-parallax-padrinhos",
            window_selector='[data-scene="padrinhos"]',
            wallpaper_selector="#wallpaperPadrinhos",
        )

        capture_section(page, "padrinhos-informacoes", "#informacoes")

        ctx.close()

        # ── Mobile ───────────────────────────────────────────
        ctx_m = browser.new_context(
            viewport=VIEWPORT_MOBILE,
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
        )
        page_m = ctx_m.new_page()

        print("Mobile:")
        goto_and_settle(page_m, f"{BASE}/")
        mask_pix_for_portfolio(page_m)
        capture_full(page_m, "home-mobile")

        goto_and_settle(page_m, f"{BASE}/padrinhos/")
        capture_parallax_window(
            page_m, "padrinhos-parallax-madrinhas-mobile",
            window_selector='[data-scene="madrinhas"]',
            wallpaper_selector="#wallpaperMadrinhas",
        )
        capture_full(page_m, "padrinhos-mobile")

        goto_and_settle(page_m, f"{BASE}/convite/")
        page_m.evaluate("""() => {
            document.getElementById('welcomeScreen').style.display = 'none';
            document.getElementById('mainContent').style.opacity = '1';
        }""")
        wait_images(page_m, 1200)
        capture_full(page_m, "convite-mobile")

        ctx_m.close()
        browser.close()

    count = len(list(OUT.glob("*.png")))
    print(f"\n{count} screenshots salvas em {OUT}")


if __name__ == "__main__":
    main()
