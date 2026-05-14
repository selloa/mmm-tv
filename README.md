# Maniac Mansion Mania TV (mmmTV)

Static mini-site: pick a random episode from the catalog that has a YouTube longplay, embed it like a TV, with Play / Pause, Next (channel surf), and episode metadata.

## Contents

| Path | Role |
|------|------|
| `index.html` | Page shell, banner, TV area, controls, metadata, footer |
| `styles.css` | Layout and styling |
| `app.js` | CSV load (Papa Parse), YouTube IFrame API, controls |
| `source/vod_index.csv` | VOD index: episodes with YouTube longplay URLs only |
| `vod_banner.png` | Header banner image |
| `LICENSE` | MIT license |
| `.github/workflows/deploy-github-pages.yml` | Deploy to GitHub Pages |

## Run locally

The catalog is loaded with `fetch()`, so the site must be served over **HTTP** (not opened as a `file://` URL).

From the repository root, for example:

```powershell
cd C:\mmm\mmm-tv
python -m http.server 8765
```

Then open `http://127.0.0.1:8765/` in your browser.

## GitHub Pages

1. Push this repository to GitHub.
2. **Settings → Pages → Build and deployment:** set **Source** to **GitHub Actions** (not “Deploy from a branch”).
3. Pushes to `main` or `master` that touch the listed paths trigger [deploy-github-pages.yml](.github/workflows/deploy-github-pages.yml); you can also run the workflow manually under **Actions**.

Project Pages URL shape: `https://<user>.github.io/<repo>/` — relative asset paths work as-is.

## Catalog

Columns in `source/vod_index.csv` are limited to what the UI needs (`catalog_id`, `category`, `title`, `release_date`, `authors`, `wiki_url_mmm`, `download_url_mmm_docman`, `youtube_longplay_url`). Rows without a usable YouTube URL are omitted from the file.

## License

This repository is licensed under the [MIT License](LICENSE).

The **code and layout** in this repo are under MIT. **Third-party** names, games, videos, and sites (e.g. Maniac Mansion Mania, YouTube, linked wikis/downloads) remain with their respective rights holders; this project only **links** to public URLs collected in `vod_index.csv`.
