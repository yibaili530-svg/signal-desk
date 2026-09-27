# Signal Collector 1.1.1

Save X posts, review relevance with JEV, and decide what to write.
No Signal account or login required. Desktop Chrome and Edge.

## Install in Chrome

1. [Download Signal Collector ZIP](https://github.com/yibaili530-svg/signal-desk/raw/refs/heads/main/extension/Signal-Collector-v1.1.1.zip) and extract it to a folder you will keep.
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and select the `Signal-Collector/extension` folder inside the extracted ZIP. In Edge, use `edge://extensions` instead.
3. Open [Signal Desk](https://signal-desk-red-rho.vercel.app/) in the **same browser profile**. In **Settings**, enter your X handle, account direction, topics and current projects, then save. The extension needs your account direction or projects to review a post.
4. Enter **your own JEV API Key** in Signal Desk Settings or in the extension popup and save it. New analyses use your API credits.
5. Open the extension popup and click **Check connection**. A success message confirms that the extension can reach Signal Desk and find your account direction. The API Key itself is verified when JEV analyzes the first post; a successful connection check does not verify the Key.
6. Refresh X, then click **↗ Signal** under a post. Wait for the result; the post appears in Collector and its full scores appear in Workspace.

The extension can also store a separate JEV Key in its settings. If present, that key takes priority; otherwise it uses the key saved in Signal Settings. No key is sent to X.

## Update

Replace the contents of your installed extension folder, click Reload on the browser extensions page, then refresh X and Signal. Keep the same extension folder to preserve existing settings and queued posts.

## Local data and backup

Posts, author names, original URLs, scores, drafts and your account direction are stored in Signal's local browser storage. They stay after closing the page. The extension and website use the same local collection in the same browser profile and on the same website origin.

In Settings, use Export backup and Import backup. Backups contain materials, scores, drafts and direction; they exclude API keys. Imports merge new materials, skip duplicates, and restore the profile from the backup. Existing duplicate materials are not overwritten.

Up to 100 posts and 2,000 total materials. Export and delete materials to make room. Browser storage quotas may be reached earlier with large drafts. Clearing browser/site data removes the local collection. Other devices and browsers do not automatically sync.

## Existing cloud data

The previous private workspace is retained at https://signal-desk-red-rho.vercel.app/owner.
Its owner can sign in and click Copy to local workspace, or export a backup. This does not delete cloud data. The normal website always opens local mode, including for previously signed-in owners.

## JEV and privacy

JEV analysis requires an internet connection and your own paid API credits. The selected post text, account profile and key pass through Signal's stateless review endpoint to TypeSafe/JEV. This endpoint does not write posts, scores or keys to the app database. Provider processing is online, not on-device.

Website keys are saved locally, unencrypted, in the site's browser storage. Extension keys and pending failures are saved locally in trusted extension storage. Neither is automatically synced. Remove the website key by clearing its field and saving Settings; remove an extension key with its Remove API Key button. Keep keys off shared browser profiles.

## Collecting on X

A spinner appears immediately while saving. A compact English result shows the relevance score. Reduced-motion preferences are respected.

The extension adds a separate Signal button; the native X bookmark button is unchanged. It reads the selected post's currently visible text. Expand long posts first. Images, video, nested quoted posts and entire threads are not extracted automatically.

If analysis fails, the saved text remains local and the extension retains a retry entry. Open the extension and click Retry pending saves. Existing scores made with the current questions are reused to avoid unnecessary repeat requests. Older scores are re-evaluated with JEV when you collect the post again.

The extension opens a background Signal tab if needed. It requests access only to X/Twitter and the fixed Signal website. If X changes its page structure, extraction may need an update.

## Tests

The extension has no build step or runtime dependencies. To run its tests with Node.js:

```sh
npm install --prefix test-deps --no-save linkedom
node --test tests/*.test.mjs
```
