# GitHub Pages SPA Routing Solution

## Problem
GitHub Pages serves static files and doesn't support server-side routing. When users navigate directly to routes like `https://portal.gritsa.com/dashboard`, GitHub Pages returns a 404 error because there's no physical file at that path.

## Solution
We've implemented the "Single Page Apps for GitHub Pages" solution that uses a custom 404.html page to handle client-side routing.

### How It Works

1. **User visits a deep link** (e.g., `https://portal.gritsa.com/dashboard`)

2. **GitHub Pages serves 404.html** because `/dashboard` doesn't exist as a physical file

3. **404.html script redirects** to `index.html` with the route encoded in the query string:
   - Original: `https://portal.gritsa.com/dashboard`
   - Redirects to: `https://portal.gritsa.com/?/dashboard`

4. **index.html script decodes** the route from the query string and uses `window.history.replaceState()` to restore the original URL without triggering a page reload

5. **React Router takes over** and renders the correct component for `/dashboard`

### Files Involved

- **`portal-app/public/404.html`**: Custom 404 page that redirects to index.html with encoded route
- **`portal-app/index.html`**: Contains script to decode the route and update browser history
- **`.nojekyll`**: Tells GitHub Pages to disable Jekyll processing (important for files starting with underscore)

### Credits
This solution is based on [spa-github-pages](https://github.com/rafgraph/spa-github-pages) by Rafael Pedicini.

### Testing
After deployment, you can test by directly navigating to:
- `https://portal.gritsa.com/dashboard`
- `https://portal.gritsa.com/profile`
- `https://portal.gritsa.com/timesheet`
- Any other route in your app

All routes should load correctly without showing a 404 error.

### Note on Custom Domains
Since you're using a custom domain (`portal.gritsa.com`), the `pathSegmentsToKeep` variable in `404.html` is set to `0`. If you were using a GitHub Project Pages URL (e.g., `username.github.io/repo-name`), you would need to set it to `1`.
