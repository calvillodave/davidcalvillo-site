# David Calvillo — Voice Actor Website

## What's here
- `index.html` — the page (hero, Listen, About, Contact)
- `styles.css` — brand colors, fonts and layout (colors are at the top)
- `player.js` — the sample player
- `content/samples.json` — your voice samples (edit through `/admin`)
- `content/settings.json` — email, location and socials (edit through `/admin`)
- `content/work.json` — the Past work section (edit through `/admin`)
- `videos/` — uploaded videos and their cover images
- `samples/` — your audio files
- `images/` — logo and headshot
- `admin/` — the site editor (Sveltia CMS)
- `CNAME` — your domain, for GitHub Pages

## Put it online with GitHub Pages
1. Create a new **public** repository on GitHub named `davidcalvillo-site` under your account `calvillodave`.
2. Upload everything in this folder to it, on the `main` branch.
   Files listed in `.gitignore` (old versions and the color preview) stay on your computer.
3. In the repository, go to **Settings → Pages**. Under **Build and deployment**, choose
   **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. Still in **Settings → Pages**, enter `davidcalvillo.com` under **Custom domain** and save (the `CNAME` file already has it).
   Once the check passes, tick **Enforce HTTPS**.
5. At your domain provider, add the DNS records GitHub shows you
   (A records for the bare domain and a CNAME record for `www`). DNS can take up to a day to update.

## Edit your samples (the site editor)
**One-time setup**
1. `admin/config.yml` already points at `calvillodave/davidcalvillo-site`. If you name the repository something else, change the `repo:` line to match.
2. Create a GitHub access token for the editor:
   GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
   - Repository access: **Only select repositories** → your site's repository
   - Permissions: **Contents → Read and write**
   - Set an expiration you're comfortable with; you'll make a new one when it expires.
   Copy the token somewhere safe, like your password manager. GitHub only shows it once.

**Every time**
1. Go to `davidcalvillo.com/admin` and choose **Sign In Using Access Token**. Paste your token (the browser remembers it).
2. Open **Website → Voice samples**:
   - **Add a sample:** click **Add Sample**, type a title, pick a category, and upload the audio file.
   - **Reorder:** drag samples up or down. The order in the editor is the order on the site.
   - **Remove:** delete a sample from the list. To also delete its audio file, remove it under **Assets**.
   - **Featured sample:** the longer narration piece at the top of the Listen section.
3. Click **Save**. The editor commits the change to GitHub, and the live site updates within a couple of minutes.

**Past work** (same editor) holds your projects:
- **YouTube:** choose *YouTube link* and paste the address. Adding `&t=46s` to the end makes it start at 0:46.
- **Your own video:** choose *Uploaded video*, upload an MP4 and, optionally, a cover image. Keep videos under about 25 MB;
  phone videos are often 60 MB or more, so export a smaller copy first (on a Mac: open in QuickTime → File → Export As → 720p).

**Contact & socials** (same editor) holds your booking email, location and social links.
Each social link gets a button in the Contact section and an icon in the footer.

Tips
- MP3 is the safest format for all browsers. Keep each file small (a 30-second MP3 at 128–192 kbps is about 0.5–0.7 MB).
- The audio placeholders in `samples/` are computer voices saying "Placeholder." Delete them once your real samples are in.
- Lengths and waveforms are read from the audio automatically.

## Preview it on your computer
```bash
cd ~/Documents/Claude/davidcalvillo-site && python3 -m http.server 5173
```
Then visit http://localhost:5173. Use this instead of double-clicking `index.html`; browsers block the
sample data, logo coloring and waveforms on files opened directly.
