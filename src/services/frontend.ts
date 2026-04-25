import { env } from '../config/env.js';
import type { CalendarSettings } from './calendar-settings-store.js';
import type { GrocyRecipeSummary } from './grocy-client.js';
import type { NorishRecipeSummary } from './norish-client.js';
import { toolCatalog, type ToolDefinition } from './tool-catalog.js';

const appName = 'Norish Tools';

type LayoutOptions = {
  title: string;
  content: string;
  activeToolSlug?: string;
  showLogout?: boolean;
  bodyClassName?: string;
};

export const renderLoginPage = (errorMessage?: string) =>
  renderDocument({
    title: 'Sign In',
    showLogout: false,
    bodyClassName: 'bg-body-tertiary',
    content: `
      <div class="container py-5">
        <div class="row justify-content-center py-5">
          <div class="col-12 col-md-10 col-lg-7 col-xl-5">
            <div class="card border-0 shadow-lg overflow-hidden">
              <div class="card-body p-4 p-lg-5">
                <span class="badge text-bg-dark rounded-pill mb-3">Frontend Access</span>
                <h1 class="display-6 fw-semibold mb-3">${escapeHtml(appName)}</h1>
                <p class="text-secondary mb-4">Enter the shared access token from your environment file to open the tools UI.</p>
                ${errorMessage ? `<div class="alert alert-danger" role="alert">${escapeHtml(errorMessage)}</div>` : ''}
                <form id="login-form" class="vstack gap-3">
                  <div>
                    <label for="token" class="form-label">Access token</label>
                    <input id="token" name="token" type="password" class="form-control form-control-lg" autocomplete="current-password" required>
                  </div>
                  <button type="submit" class="btn btn-dark btn-lg">Sign In</button>
                </form>
                <p id="login-error" class="text-danger small mt-3 mb-0 d-none"></p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <script>
        const form = document.getElementById('login-form');
        const error = document.getElementById('login-error');
        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          error.classList.add('d-none');
          const token = new FormData(form).get('token');
          const response = await fetch('/login', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ token }),
          });
          if (response.ok) {
            window.location.assign('/');
            return;
          }
          const payload = await response.json().catch(() => ({ message: 'Unable to sign in' }));
          error.textContent = payload.message || 'Unable to sign in';
          error.classList.remove('d-none');
        });
      </script>
    `,
  });

export const renderHomePage = (tools: ToolDefinition[]) =>
  renderDocument({
    title: 'Home',
    showLogout: true,
    content: `
      <section class="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-4">
        <div>
          <h1 class="h2 mb-1">Tools</h1>
          <p class="text-secondary mb-0">Choose a module.</p>
        </div>
        <div class="small text-secondary">${getLiveTools(tools).length} total</div>
      </section>
      <section>
        <div class="row g-4">
          ${getLiveTools(tools).map((tool) => renderToolCard(tool)).join('')}
        </div>
      </section>
    `,
  });

export const renderToolPage = (tool: ToolDefinition) =>
  renderDocument({
    title: tool.title,
    activeToolSlug: tool.slug,
    showLogout: true,
    content: `
      <section class="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-4">
        <div>
          <div class="d-flex align-items-center gap-2 mb-2">
            <h1 class="h2 mb-0">${escapeHtml(tool.title)}</h1>
            <span class="badge text-bg-warning text-uppercase">${escapeHtml(tool.status)}</span>
          </div>
          <p class="text-secondary mb-0">${escapeHtml(tool.summary)}</p>
        </div>
        <a href="/" class="btn btn-outline-dark">Back</a>
      </section>
      <section class="card border-0 shadow-sm">
        <div class="card-body p-4">
          <p class="mb-4">${escapeHtml(tool.description)}</p>
          <h2 class="h6 text-uppercase text-secondary mb-3">Scope</h2>
          <ul class="list-group list-group-flush">
            ${tool.highlights
              .map((item) => `<li class="list-group-item px-0">${escapeHtml(item)}</li>`)
              .join('')}
          </ul>
        </div>
      </section>
    `,
  });

export const renderCalendarPage = (tool: ToolDefinition, calendarFeedUrl: string, settings: CalendarSettings) =>
  renderDocument({
    title: tool.title,
    activeToolSlug: tool.slug,
    showLogout: true,
    content: `
      <section class="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-4">
        <div>
          <div class="d-flex align-items-center gap-2 mb-2">
            <h1 class="h2 mb-0">${escapeHtml(tool.title)}</h1>
            <span class="badge text-bg-success text-uppercase">${escapeHtml(tool.status)}</span>
          </div>
          <p class="text-secondary mb-0">Rolling ICS export using the same Norish calendar endpoint as the main app.</p>
        </div>
        <a href="/" class="btn btn-outline-dark">Back</a>
      </section>
      <section class="row g-4">
        <div class="col-12 col-lg-8">
          <div class="card border-0 shadow-sm">
            <div class="card-body p-4">
              <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
                <h2 class="h5 mb-0">Feed</h2>
                <a href="${escapeAttribute(calendarFeedUrl)}" class="btn btn-dark">Open Feed</a>
              </div>
              <label for="calendar-feed-url" class="form-label">Subscription URL</label>
              <div class="input-group mb-3">
                <input id="calendar-feed-url" class="form-control" type="text" readonly value="${escapeAttribute(calendarFeedUrl)}">
                <button id="copy-feed-url" class="btn btn-outline-secondary" type="button">Copy</button>
              </div>
              <div class="d-flex gap-2 flex-wrap mb-3">
                <button id="regenerate-feed-token" class="btn btn-outline-danger" type="button">Regenerate Feed Token</button>
              </div>
              <p id="calendar-token-status" class="small text-secondary mb-4">This URL includes a dedicated calendar feed token generated for this instance and stored outside the env file.</p>
              <h3 class="h6 text-uppercase text-secondary mb-3">Feed Contents</h3>
              <ul class="list-group list-group-flush">
                <li class="list-group-item px-0">The feed uses Norish's internal calendar.listItems endpoint over a rolling date range instead of the one-month public endpoint.</li>
                <li class="list-group-item px-0">Breakfast, lunch, and dinner events use configured times and durations instead of all-day entries.</li>
                <li class="list-group-item px-0">Event summary formatted as meal slot plus recipe name.</li>
                <li class="list-group-item px-0">Description fields for servings, calories, recipe ID, and planned item ID when available.</li>
              </ul>
            </div>
          </div>
        </div>
        <div class="col-12 col-lg-4">
          <div class="card border-0 shadow-sm mb-4">
            <div class="card-body p-4">
              <p class="text-uppercase small text-secondary fw-semibold mb-2">Meal Times</p>
              <div class="vstack gap-3 mb-3">
                <div>
                  <label for="calendar-breakfast-time" class="form-label">Breakfast</label>
                  <input id="calendar-breakfast-time" class="form-control" type="time" value="${escapeAttribute(settings.mealTimes.Breakfast)}">
                  <label for="calendar-breakfast-duration" class="form-label mt-2">Breakfast Length (minutes)</label>
                  <input id="calendar-breakfast-duration" class="form-control" type="number" min="1" max="720" step="1" value="${escapeAttribute(String(settings.mealDurations.Breakfast))}">
                </div>
                <div>
                  <label for="calendar-lunch-time" class="form-label">Lunch</label>
                  <input id="calendar-lunch-time" class="form-control" type="time" value="${escapeAttribute(settings.mealTimes.Lunch)}">
                  <label for="calendar-lunch-duration" class="form-label mt-2">Lunch Length (minutes)</label>
                  <input id="calendar-lunch-duration" class="form-control" type="number" min="1" max="720" step="1" value="${escapeAttribute(String(settings.mealDurations.Lunch))}">
                </div>
                <div>
                  <label for="calendar-dinner-time" class="form-label">Dinner</label>
                  <input id="calendar-dinner-time" class="form-control" type="time" value="${escapeAttribute(settings.mealTimes.Dinner)}">
                  <label for="calendar-dinner-duration" class="form-label mt-2">Dinner Length (minutes)</label>
                  <input id="calendar-dinner-duration" class="form-control" type="number" min="1" max="720" step="1" value="${escapeAttribute(String(settings.mealDurations.Dinner))}">
                </div>
              </div>
              <button id="save-calendar-settings" class="btn btn-outline-dark w-100" type="button">Save Calendar Settings</button>
            </div>
          </div>
          <div class="card border-0 shadow-sm mb-4">
            <div class="card-body p-4">
              <p class="text-uppercase small text-secondary fw-semibold mb-2">Usage</p>
              <ul class="list-group list-group-flush">
                <li class="list-group-item px-0">Subscribe from Apple Calendar, Google Calendar, or Outlook-compatible tools.</li>
                <li class="list-group-item px-0">Share a read-only view of the current meal plan.</li>
                <li class="list-group-item px-0">Use the feed as a base for downstream automations.</li>
              </ul>
            </div>
          </div>
          <div class="card border-0 shadow-sm">
            <div class="card-body p-4">
              <p class="text-uppercase small text-secondary fw-semibold mb-2">Security note</p>
              <p class="mb-0">Treat the subscription URL like a secret. Regenerating the feed token immediately invalidates any previously shared calendar links.</p>
            </div>
          </div>
        </div>
      </section>
      <script>
        const copyButton = document.getElementById('copy-feed-url');
        const feedInput = document.getElementById('calendar-feed-url');
        const regenerateButton = document.getElementById('regenerate-feed-token');
        const saveSettingsButton = document.getElementById('save-calendar-settings');
        const breakfastTimeInput = document.getElementById('calendar-breakfast-time');
        const breakfastDurationInput = document.getElementById('calendar-breakfast-duration');
        const lunchTimeInput = document.getElementById('calendar-lunch-time');
        const lunchDurationInput = document.getElementById('calendar-lunch-duration');
        const dinnerTimeInput = document.getElementById('calendar-dinner-time');
        const dinnerDurationInput = document.getElementById('calendar-dinner-duration');
        const status = document.getElementById('calendar-token-status');
        copyButton.addEventListener('click', async () => {
          await navigator.clipboard.writeText(feedInput.value);
          copyButton.textContent = 'Copied';
          window.setTimeout(() => {
            copyButton.textContent = 'Copy';
          }, 1200);
        });
        regenerateButton.addEventListener('click', async () => {
          regenerateButton.setAttribute('disabled', 'disabled');
          status.textContent = 'Regenerating feed token...';
          try {
            const response = await fetch('/calendar/token/regenerate', { method: 'POST' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload.token) {
              throw new Error(payload.message || 'Unable to regenerate token');
            }
            const nextUrl = new URL(feedInput.value);
            nextUrl.searchParams.set('token', payload.token);
            feedInput.value = nextUrl.toString();
            status.textContent = 'Feed token regenerated. Existing shared calendar links are now invalid.';
          } catch (error) {
            status.textContent = error instanceof Error ? error.message : 'Unable to regenerate token';
          } finally {
            regenerateButton.removeAttribute('disabled');
          }
        });
        if (
          saveSettingsButton instanceof HTMLButtonElement &&
          breakfastTimeInput instanceof HTMLInputElement &&
          breakfastDurationInput instanceof HTMLInputElement &&
          lunchTimeInput instanceof HTMLInputElement &&
          lunchDurationInput instanceof HTMLInputElement &&
          dinnerTimeInput instanceof HTMLInputElement
          && dinnerDurationInput instanceof HTMLInputElement
        ) {
          saveSettingsButton.addEventListener('click', async () => {
            saveSettingsButton.setAttribute('disabled', 'disabled');
            status.textContent = 'Saving calendar settings...';
            try {
              const response = await fetch('/calendar/settings', {
                method: 'POST',
                headers: {
                  'content-type': 'application/json',
                  accept: 'application/json',
                },
                body: JSON.stringify({
                  mealTimes: {
                    Breakfast: breakfastTimeInput.value,
                    Lunch: lunchTimeInput.value,
                    Dinner: dinnerTimeInput.value,
                  },
                  mealDurations: {
                    Breakfast: breakfastDurationInput.value,
                    Lunch: lunchDurationInput.value,
                    Dinner: dinnerDurationInput.value,
                  },
                }),
              });
              const payload = await response.json().catch(() => ({}));
              if (!response.ok || !payload.settings) {
                throw new Error(payload.message || 'Unable to save calendar settings');
              }
              breakfastTimeInput.value = payload.settings.mealTimes.Breakfast;
              breakfastDurationInput.value = String(payload.settings.mealDurations.Breakfast);
              lunchTimeInput.value = payload.settings.mealTimes.Lunch;
              lunchDurationInput.value = String(payload.settings.mealDurations.Lunch);
              dinnerTimeInput.value = payload.settings.mealTimes.Dinner;
              dinnerDurationInput.value = String(payload.settings.mealDurations.Dinner);
              status.textContent = payload.message || 'Calendar settings updated.';
            } catch (error) {
              status.textContent = error instanceof Error ? error.message : 'Unable to save calendar settings';
            } finally {
              saveSettingsButton.removeAttribute('disabled');
            }
          });
        }
      </script>
    `,
  });

export const renderGrocyImportPage = (tool: ToolDefinition) =>
  renderDocument({
    title: tool.title,
    activeToolSlug: tool.slug,
    showLogout: true,
    content: `
      <section class="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-4">
        <div>
          <div class="d-flex align-items-center gap-2 mb-2">
            <h1 class="h2 mb-0">${escapeHtml(tool.title)}</h1>
            <span class="badge text-bg-success text-uppercase">${escapeHtml(tool.status)}</span>
          </div>
          <p class="text-secondary mb-0">Enter the Grocy connection details for the upcoming import workflow.</p>
        </div>
        <a href="/" class="btn btn-outline-dark">Back</a>
      </section>
      <section class="row g-4">
        <div class="col-12 col-lg-8">
          <div class="card border-0 shadow-sm">
            <div class="card-body p-4">
              <h2 class="h5 mb-3">Connection</h2>
              <div id="grocy-import-status"></div>
              <div id="grocy-import-panel" class="vstack gap-3">
                <div>
                  <label for="grocy-url" class="form-label">Grocy URL</label>
                  <input id="grocy-url" name="grocyUrl" type="url" class="form-control" placeholder="https://grocy.example.com" autocomplete="url" required>
                </div>
                <div>
                  <label for="grocy-api-token" class="form-label">Grocy API Token</label>
                  <input id="grocy-api-token" name="grocyApiToken" type="password" class="form-control" placeholder="Enter Grocy API token" autocomplete="off" required>
                </div>
                <div>
                  <button id="grocy-import-submit" type="button" class="btn btn-dark">
                    <span id="grocy-import-submit-label">Validate Connection</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div id="grocy-import-results"></div>
        </div>
        <div class="col-12 col-lg-4">
          <div class="card border-0 shadow-sm">
            <div class="card-body p-4">
              <p class="text-uppercase small text-secondary fw-semibold mb-2">Next Step</p>
              <p class="mb-0">The Grocy URL and token are kept in browser storage so they survive refreshes without being stored server-side.</p>
            </div>
          </div>
        </div>
      </section>
      <script>
        (() => {
          const grocyUrlInput = document.getElementById('grocy-url');
          const grocyApiTokenInput = document.getElementById('grocy-api-token');
          const grocyImportPanel = document.getElementById('grocy-import-panel');
          const grocyImportSubmit = document.getElementById('grocy-import-submit');
          const grocyImportSubmitLabel = document.getElementById('grocy-import-submit-label');
          const grocyImportStatus = document.getElementById('grocy-import-status');
          const grocyImportResults = document.getElementById('grocy-import-results');
          const grocyUrlStorageKey = 'norish-tools.grocy-import.url';
          const grocyApiTokenStorageKey = 'norish-tools.grocy-import.api-token';
          let currentRecipes = [];

          const escapeHtmlForBrowser = (value) =>
            value
              .replaceAll('&', '&amp;')
              .replaceAll('<', '&lt;')
              .replaceAll('>', '&gt;')
              .replaceAll('"', '&quot;')
              .replaceAll("'", '&#39;');

          const safeStorageGet = (storageKey) => {
            try {
              return window.localStorage.getItem(storageKey);
            } catch {
              return null;
            }
          };

          const safeStorageSet = (storageKey, value) => {
            try {
              window.localStorage.setItem(storageKey, value);
            } catch {
              // Ignore storage failures and keep the page interactive.
            }
          };

          if (
            !(grocyUrlInput instanceof HTMLInputElement) ||
            !(grocyApiTokenInput instanceof HTMLInputElement) ||
            !(grocyImportPanel instanceof HTMLElement) ||
            !(grocyImportSubmit instanceof HTMLButtonElement) ||
            !(grocyImportSubmitLabel instanceof HTMLElement) ||
            !(grocyImportStatus instanceof HTMLElement) ||
            !(grocyImportResults instanceof HTMLElement)
          ) {
            return;
          }

          const applyStoredValue = (element, storageKey) => {
            const storedValue = safeStorageGet(storageKey);
            if (storedValue && !element.value) {
              element.value = storedValue;
            }
          };

          const bindPersistence = (element, storageKey) => {
            element.addEventListener('input', () => {
              safeStorageSet(storageKey, element.value);
            });
          };

          const renderStatus = (kind, message) => {
            if (!message) {
              grocyImportStatus.innerHTML = '';
              return;
            }

            const alertClass = kind === 'error' ? 'alert-danger' : kind === 'success' ? 'alert-success' : 'alert-secondary';
            grocyImportStatus.innerHTML = '<div class="alert ' + alertClass + '" role="alert">' + escapeHtmlForBrowser(message) + '</div>';
          };

          const renderRecipes = (recipes) => {
            currentRecipes = Array.isArray(recipes) ? recipes : [];

            if (!Array.isArray(recipes)) {
              grocyImportResults.innerHTML = '';
              return;
            }

            if (recipes.length === 0) {
              grocyImportResults.innerHTML =
                '<div class="card border-0 shadow-sm mt-4">' +
                  '<div class="card-body p-4">' +
                    '<h2 class="h5 mb-2">No Recipes Found</h2>' +
                    '<p class="text-secondary mb-0">The Grocy connection worked, but there are no importable normal recipes to show.</p>' +
                  '</div>' +
                '</div>';
              return;
            }

            grocyImportResults.innerHTML =
              '<div class="card border-0 shadow-sm mt-4">' +
                '<div class="card-body p-4">' +
                  '<div class="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">' +
                    '<h2 class="h5 mb-0">Grocy Recipes</h2>' +
                    '<span class="small text-secondary">' + recipes.length + ' found</span>' +
                  '</div>' +
                  '<div class="table-responsive">' +
                    '<table class="table align-middle mb-0">' +
                      '<thead><tr><th scope="col">ID</th><th scope="col">Name</th><th scope="col" class="text-end">Import</th></tr></thead>' +
                      '<tbody>' +
                        recipes.map((recipe) =>
                          (() => {
                            const hasDescription = typeof recipe.description === 'string' && recipe.description.trim().length > 0;
                            const actionLabel = hasDescription ? 'Import' : 'Generate and Import';
                            const norishMatch = recipe.norishMatch && typeof recipe.norishMatch === 'object' ? recipe.norishMatch : null;
                            const isDuplicate = norishMatch !== null;
                            const duplicateMarkup = isDuplicate
                              ? '<div class="small text-warning-emphasis mt-1">Already in Norish as ' + escapeHtmlForBrowser(String(norishMatch.name || '')) + '</div>'
                              : (!hasDescription
                                  ? '<div class="small text-secondary mt-1">No Grocy description. This import will generate recipe text first.</div>'
                                  : '');

                            return (
                          '<tr>' +
                            '<td>' + escapeHtmlForBrowser(String(recipe.id ?? '')) + '</td>' +
                            '<td>' +
                              '<div>' + escapeHtmlForBrowser(String(recipe.name ?? '')) + '</div>' +
                              duplicateMarkup +
                            '</td>' +
                            '<td class="text-end">' +
                              '<button type="button" class="btn btn-sm ' + (isDuplicate ? 'btn-outline-secondary' : 'btn-outline-dark') + ' grocy-import-action" data-recipe-id="' + escapeHtmlForBrowser(String(recipe.id ?? '')) + '"' + (isDuplicate ? ' disabled' : '') + '>' + escapeHtmlForBrowser(actionLabel) + '</button>' +
                            '</td>' +
                          '</tr>'
                            );
                          })()
                        ).join('') +
                      '</tbody>' +
                    '</table>' +
                  '</div>' +
                '</div>' +
              '</div>';
          };

          const renderLoadingState = () => {
            grocyImportResults.innerHTML =
              '<div class="card border-0 shadow-sm mt-4">' +
                '<div class="card-body p-4 d-flex align-items-center gap-3">' +
                  '<div class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></div>' +
                  '<div>' +
                    '<h2 class="h6 mb-1">Checking Grocy</h2>' +
                    '<p class="text-secondary mb-0">Validating the connection and loading recipes.</p>' +
                  '</div>' +
                '</div>' +
              '</div>';
          };

          const setLoading = (isLoading) => {
            if (isLoading) {
              grocyImportSubmit.setAttribute('disabled', 'disabled');
              grocyImportSubmitLabel.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Validating...';
              return;
            }

            grocyImportSubmit.removeAttribute('disabled');
            grocyImportSubmitLabel.textContent = 'Validate Connection';
          };

          const setRecipeImportLoading = (recipeId, isLoading) => {
            const importButton = Array.from(grocyImportResults.querySelectorAll('.grocy-import-action')).find(
              (candidate) => candidate instanceof HTMLButtonElement && candidate.getAttribute('data-recipe-id') === String(recipeId),
            );
            if (!(importButton instanceof HTMLButtonElement)) {
              return;
            }

            if (isLoading) {
              importButton.setAttribute('disabled', 'disabled');
              importButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Importing...';
              return;
            }

            importButton.removeAttribute('disabled');
            importButton.textContent = 'Import';
          };

          const validateGrocyConnection = async () => {
            setLoading(true);
            renderStatus('info', 'Validating Grocy connection...');
            renderLoadingState();

            try {
              const response = await fetch('/tools/grocy-import/connect', {
                method: 'POST',
                headers: {
                  'content-type': 'application/json',
                  accept: 'application/json',
                },
                body: JSON.stringify({
                  grocyUrl: grocyUrlInput.value,
                  grocyApiToken: grocyApiTokenInput.value,
                }),
              });

              const payload = await response.json().catch(() => ({}));

              if (!response.ok) {
                throw new Error(payload.message || 'Unable to validate Grocy connection.');
              }

              renderStatus('success', payload.message || 'Connection validated.');
              renderRecipes(payload.recipes || []);
            } catch (error) {
              renderRecipes([]);
              renderStatus('error', error instanceof Error ? error.message : 'Unable to validate Grocy connection.');
            } finally {
              setLoading(false);
            }
          };

          const importGrocyRecipe = async (recipeId) => {
            const recipe = currentRecipes.find((candidate) => String(candidate.id) === String(recipeId));

            if (!recipe) {
              renderStatus('error', 'Unable to locate the selected Grocy recipe.');
              return;
            }

            if (recipe.norishMatch) {
              renderStatus('error', recipe.name + ' already exists in Norish. Import skipped to avoid a duplicate.');
              return;
            }

            setRecipeImportLoading(recipeId, true);
            renderStatus('info', (recipe.description ? 'Importing ' : 'Generating and importing ') + recipe.name + '...');

            try {
              const response = await fetch('/tools/grocy-import/import', {
                method: 'POST',
                headers: {
                  'content-type': 'application/json',
                  accept: 'application/json',
                },
                body: JSON.stringify({
                  grocyUrl: grocyUrlInput.value,
                  grocyApiToken: grocyApiTokenInput.value,
                  recipeId,
                  forceAI: true,
                }),
              });

              const payload = await response.json().catch(() => ({}));

              if (!response.ok) {
                throw new Error(payload.message || 'Unable to import Grocy recipe.');
              }

              const recipeIds = Array.isArray(payload.recipeIds) && payload.recipeIds.length > 0
                ? ' Norish recipe IDs: ' + payload.recipeIds.join(', ')
                : '';
              renderStatus('success', (payload.message || ('Imported ' + recipe.name + '.')) + recipeIds);
            } catch (error) {
              renderStatus('error', error instanceof Error ? error.message : 'Unable to import Grocy recipe.');
            } finally {
              setRecipeImportLoading(recipeId, false);
            }
          };

          applyStoredValue(grocyUrlInput, grocyUrlStorageKey);
          applyStoredValue(grocyApiTokenInput, grocyApiTokenStorageKey);
          bindPersistence(grocyUrlInput, grocyUrlStorageKey);
          bindPersistence(grocyApiTokenInput, grocyApiTokenStorageKey);

          grocyImportSubmit.addEventListener('click', () => {
            void validateGrocyConnection();
          });

          grocyImportPanel.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') {
              return;
            }

            event.preventDefault();
            void validateGrocyConnection();
          });

          grocyImportResults.addEventListener('click', (event) => {
            if (!(event.target instanceof Element)) {
              return;
            }

            const importButton = event.target.closest('.grocy-import-action');
            if (!(importButton instanceof HTMLButtonElement)) {
              return;
            }

            const recipeId = importButton.getAttribute('data-recipe-id') || '';
            void importGrocyRecipe(recipeId);
          });
        })();
      </script>
    `,
  });

export const renderCreateRecipePage = (tool: ToolDefinition) =>
  renderDocument({
    title: tool.title,
    activeToolSlug: tool.slug,
    showLogout: true,
    content: `
      <section class="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-4">
        <div>
          <div class="d-flex align-items-center gap-2 mb-2">
            <h1 class="h2 mb-0">${escapeHtml(tool.title)}</h1>
            <span class="badge text-bg-success text-uppercase">${escapeHtml(tool.status)}</span>
          </div>
          <p class="text-secondary mb-0">Type a dish title, generate a full recipe, review or edit it, and then import it into Norish.</p>
        </div>
        <a href="/" class="btn btn-outline-dark">Back</a>
      </section>
      <section class="row g-4">
        <div class="col-12 col-lg-8">
          <div class="card border-0 shadow-sm">
            <div class="card-body p-4">
              <h2 class="h5 mb-3">Recipe Title</h2>
              <div id="create-recipe-status"></div>
              <div id="create-recipe-panel" class="vstack gap-3">
                <div>
                  <label for="create-recipe-title" class="form-label">Dish Title</label>
                  <input id="create-recipe-title" type="text" class="form-control" placeholder="Chicken Tikka Masala">
                </div>
                <div>
                  <button id="create-recipe-submit" type="button" class="btn btn-dark">
                    <span id="create-recipe-submit-label">Generate Recipe</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div id="create-recipe-preview" class="card border-0 shadow-sm mt-4 d-none">
            <div class="card-body p-4">
              <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
                <h2 class="h5 mb-0">Review</h2>
                <button id="create-recipe-import" type="button" class="btn btn-dark">
                  <span id="create-recipe-import-label">Import to Norish</span>
                </button>
              </div>
              <div>
                <label for="create-recipe-text" class="form-label">Generated Recipe Text</label>
                <textarea id="create-recipe-text" class="form-control" rows="18" spellcheck="false"></textarea>
              </div>
            </div>
          </div>
        </div>
        <div class="col-12 col-lg-4">
          <div class="card border-0 shadow-sm">
            <div class="card-body p-4">
              <p class="text-uppercase small text-secondary fw-semibold mb-2">How It Works</p>
              <p class="mb-0">The title is expanded into a full recipe using OpenAI. You can review and edit the generated text before import. Exact-name matches already in Norish are blocked to reduce duplicates.</p>
            </div>
          </div>
        </div>
      </section>
      <script>
        (() => {
          const titleInput = document.getElementById('create-recipe-title');
          const panel = document.getElementById('create-recipe-panel');
          const submitButton = document.getElementById('create-recipe-submit');
          const submitLabel = document.getElementById('create-recipe-submit-label');
          const importButton = document.getElementById('create-recipe-import');
          const importLabel = document.getElementById('create-recipe-import-label');
          const previewCard = document.getElementById('create-recipe-preview');
          const recipeText = document.getElementById('create-recipe-text');
          const status = document.getElementById('create-recipe-status');
          let generatedForTitle = '';

          const escapeHtmlForBrowser = (value) =>
            value
              .replaceAll('&', '&amp;')
              .replaceAll('<', '&lt;')
              .replaceAll('>', '&gt;')
              .replaceAll('"', '&quot;')
              .replaceAll("'", '&#39;');

          if (
            !(titleInput instanceof HTMLInputElement) ||
            !(panel instanceof HTMLElement) ||
            !(submitButton instanceof HTMLButtonElement) ||
            !(submitLabel instanceof HTMLElement) ||
            !(importButton instanceof HTMLButtonElement) ||
            !(importLabel instanceof HTMLElement) ||
            !(previewCard instanceof HTMLElement) ||
            !(recipeText instanceof HTMLTextAreaElement) ||
            !(status instanceof HTMLElement)
          ) {
            return;
          }

          const renderStatus = (kind, message) => {
            if (!message) {
              status.innerHTML = '';
              return;
            }

            const alertClass = kind === 'error' ? 'alert-danger' : kind === 'success' ? 'alert-success' : 'alert-secondary';
            status.innerHTML = '<div class="alert ' + alertClass + '" role="alert">' + escapeHtmlForBrowser(message) + '</div>';
          };

          const setGenerateLoading = (isLoading) => {
            if (isLoading) {
              submitButton.setAttribute('disabled', 'disabled');
              submitLabel.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Generating...';
              return;
            }

            submitButton.removeAttribute('disabled');
            submitLabel.textContent = 'Generate Recipe';
          };

          const setImportLoading = (isLoading) => {
            if (isLoading) {
              importButton.setAttribute('disabled', 'disabled');
              importLabel.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Importing...';
              return;
            }

            importButton.removeAttribute('disabled');
            importLabel.textContent = 'Import to Norish';
          };

          const hidePreview = () => {
            previewCard.classList.add('d-none');
            recipeText.value = '';
            generatedForTitle = '';
          };

          const showPreview = (text) => {
            recipeText.value = text;
            previewCard.classList.remove('d-none');
          };

          const generateRecipe = async () => {
            const title = titleInput.value.trim();

            if (!title) {
              renderStatus('error', 'A dish title is required.');
              return;
            }

            setGenerateLoading(true);
            renderStatus('info', 'Generating recipe for ' + title + '...');

            try {
              const response = await fetch('/tools/create-recipe/generate', {
                method: 'POST',
                headers: {
                  'content-type': 'application/json',
                  accept: 'application/json',
                },
                body: JSON.stringify({ title }),
              });

              const payload = await response.json().catch(() => ({}));

              if (!response.ok) {
                throw new Error(payload.message || 'Unable to create recipe.');
              }

              generatedForTitle = title;
              showPreview(typeof payload.text === 'string' ? payload.text : '');
              renderStatus('success', payload.message || ('Generated ' + title + '. Review before importing.'));
            } catch (error) {
              hidePreview();
              renderStatus('error', error instanceof Error ? error.message : 'Unable to create recipe.');
            } finally {
              setGenerateLoading(false);
            }
          };

          const importRecipe = async () => {
            const title = titleInput.value.trim();
            const text = recipeText.value.trim();

            if (!title) {
              renderStatus('error', 'A dish title is required.');
              return;
            }

            if (!text) {
              renderStatus('error', 'Generate a recipe before importing.');
              return;
            }

            if (generatedForTitle !== title) {
              renderStatus('error', 'The dish title changed after generation. Regenerate the recipe before importing.');
              return;
            }

            setImportLoading(true);
            renderStatus('info', 'Importing ' + title + '...');

            try {
              const response = await fetch('/tools/create-recipe/import', {
                method: 'POST',
                headers: {
                  'content-type': 'application/json',
                  accept: 'application/json',
                },
                body: JSON.stringify({ title, text }),
              });

              const payload = await response.json().catch(() => ({}));

              if (!response.ok) {
                throw new Error(payload.message || 'Unable to import recipe.');
              }

              const recipeIds = Array.isArray(payload.recipeIds) && payload.recipeIds.length > 0
                ? ' Norish recipe IDs: ' + payload.recipeIds.join(', ')
                : '';
              renderStatus('success', (payload.message || ('Imported ' + title + '.')) + recipeIds);
            } catch (error) {
              renderStatus('error', error instanceof Error ? error.message : 'Unable to import recipe.');
            } finally {
              setImportLoading(false);
            }
          };

          submitButton.addEventListener('click', () => {
            void generateRecipe();
          });

          importButton.addEventListener('click', () => {
            void importRecipe();
          });

          panel.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') {
              return;
            }

            event.preventDefault();
            void generateRecipe();
          });

          titleInput.addEventListener('input', () => {
            if (generatedForTitle && titleInput.value.trim() !== generatedForTitle) {
              renderStatus('info', 'Dish title changed. Regenerate the recipe preview before importing.');
            }
          });

          hidePreview();
        })();
      </script>
    `,
  });

export const renderDeleteRecipePage = (tool: ToolDefinition) =>
  renderDocument({
    title: tool.title,
    activeToolSlug: tool.slug,
    showLogout: true,
    content: `
      <section class="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-4">
        <div>
          <div class="d-flex align-items-center gap-2 mb-2">
            <h1 class="h2 mb-0">${escapeHtml(tool.title)}</h1>
            <span class="badge text-bg-success text-uppercase">${escapeHtml(tool.status)}</span>
          </div>
          <p class="text-secondary mb-0">Search the Norish recipe catalog and delete recipes directly.</p>
        </div>
        <a href="/" class="btn btn-outline-dark">Back</a>
      </section>
      <section class="row g-4">
        <div class="col-12 col-lg-8">
          <div class="card border-0 shadow-sm">
            <div class="card-body p-4">
              <h2 class="h5 mb-3">Recipe Search</h2>
              <div id="delete-recipe-status"></div>
              <div id="delete-recipe-panel" class="vstack gap-3">
                <div>
                  <label for="delete-recipe-search" class="form-label">Search</label>
                  <input id="delete-recipe-search" type="text" class="form-control" placeholder="Recipe name, ingredient, description">
                </div>
                <div>
                  <button id="delete-recipe-submit" type="button" class="btn btn-dark">
                    <span id="delete-recipe-submit-label">Search Recipes</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div id="delete-recipe-results" class="mt-4"></div>
        </div>
        <div class="col-12 col-lg-4">
          <div class="card border-0 shadow-sm">
            <div class="card-body p-4">
              <p class="text-uppercase small text-secondary fw-semibold mb-2">Warning</p>
              <p class="mb-0">Recipe deletion is immediate. Use search to find the exact recipe and confirm before deleting it.</p>
            </div>
          </div>
        </div>
      </section>
      <script>
        (() => {
          const searchInput = document.getElementById('delete-recipe-search');
          const searchPanel = document.getElementById('delete-recipe-panel');
          const searchButton = document.getElementById('delete-recipe-submit');
          const searchButtonLabel = document.getElementById('delete-recipe-submit-label');
          const status = document.getElementById('delete-recipe-status');
          const results = document.getElementById('delete-recipe-results');
          let currentRecipes = [];

          const escapeHtmlForBrowser = (value) =>
            value
              .replaceAll('&', '&amp;')
              .replaceAll('<', '&lt;')
              .replaceAll('>', '&gt;')
              .replaceAll('"', '&quot;')
              .replaceAll("'", '&#39;');

          if (
            !(searchInput instanceof HTMLInputElement) ||
            !(searchPanel instanceof HTMLElement) ||
            !(searchButton instanceof HTMLButtonElement) ||
            !(searchButtonLabel instanceof HTMLElement) ||
            !(status instanceof HTMLElement) ||
            !(results instanceof HTMLElement)
          ) {
            return;
          }

          const renderStatus = (kind, message) => {
            if (!message) {
              status.innerHTML = '';
              return;
            }

            const alertClass = kind === 'error' ? 'alert-danger' : kind === 'success' ? 'alert-success' : 'alert-secondary';
            status.innerHTML = '<div class="alert ' + alertClass + '" role="alert">' + escapeHtmlForBrowser(message) + '</div>';
          };

          const renderEmptyState = (message) => {
            results.innerHTML =
              '<div class="card border-0 shadow-sm">' +
                '<div class="card-body p-4">' +
                  '<p class="text-secondary mb-0">' + escapeHtmlForBrowser(message) + '</p>' +
                '</div>' +
              '</div>';
          };

          const renderResults = (recipes) => {
            currentRecipes = Array.isArray(recipes) ? recipes : [];

            if (!Array.isArray(recipes) || recipes.length === 0) {
              renderEmptyState('No recipes matched that search.');
              return;
            }

            results.innerHTML =
              '<div class="card border-0 shadow-sm">' +
                '<div class="card-body p-4">' +
                  '<div class="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">' +
                    '<h2 class="h5 mb-0">Matching Recipes</h2>' +
                    '<span class="small text-secondary">' + recipes.length + ' found</span>' +
                  '</div>' +
                  '<div class="table-responsive">' +
                    '<table class="table align-middle mb-0">' +
                      '<thead><tr><th scope="col">Name</th><th scope="col">Categories</th><th scope="col">Updated</th><th scope="col" class="text-end">Delete</th></tr></thead>' +
                      '<tbody>' +
                        recipes.map((recipe) =>
                          '<tr>' +
                            '<td>' +
                              '<div class="fw-semibold">' + escapeHtmlForBrowser(String(recipe.name ?? '')) + '</div>' +
                              '<div class="small text-secondary">' + escapeHtmlForBrowser(String(recipe.id ?? '')) + '</div>' +
                            '</td>' +
                            '<td>' + escapeHtmlForBrowser(Array.isArray(recipe.categories) ? recipe.categories.join(', ') || '-' : '-') + '</td>' +
                            '<td>' + escapeHtmlForBrowser(formatTimestamp(recipe.updatedAt)) + '</td>' +
                            '<td class="text-end">' +
                              '<button type="button" class="btn btn-sm btn-outline-danger delete-recipe-action" data-recipe-id="' + escapeHtmlForBrowser(String(recipe.id ?? '')) + '">Delete</button>' +
                            '</td>' +
                          '</tr>'
                        ).join('') +
                      '</tbody>' +
                    '</table>' +
                  '</div>' +
                '</div>' +
              '</div>';
          };

          const formatTimestamp = (value) => {
            if (typeof value !== 'string' || value.length === 0) {
              return '-';
            }

            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
              return value;
            }

            return date.toLocaleString();
          };

          const setSearchLoading = (isLoading) => {
            if (isLoading) {
              searchButton.setAttribute('disabled', 'disabled');
              searchButtonLabel.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Searching...';
              return;
            }

            searchButton.removeAttribute('disabled');
            searchButtonLabel.textContent = 'Search Recipes';
          };

          const setDeleteLoading = (recipeId, isLoading) => {
            const deleteButton = Array.from(results.querySelectorAll('.delete-recipe-action')).find(
              (candidate) => candidate instanceof HTMLButtonElement && candidate.getAttribute('data-recipe-id') === String(recipeId),
            );
            if (!(deleteButton instanceof HTMLButtonElement)) {
              return;
            }

            if (isLoading) {
              deleteButton.setAttribute('disabled', 'disabled');
              deleteButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Deleting...';
              return;
            }

            deleteButton.removeAttribute('disabled');
            deleteButton.textContent = 'Delete';
          };

          const searchRecipes = async () => {
            setSearchLoading(true);
            renderStatus('info', 'Searching recipes...');

            try {
              const response = await fetch('/tools/delete-recipe/search', {
                method: 'POST',
                headers: {
                  'content-type': 'application/json',
                  accept: 'application/json',
                },
                body: JSON.stringify({
                  search: searchInput.value,
                }),
              });

              const payload = await response.json().catch(() => ({}));
              if (!response.ok) {
                throw new Error(payload.message || 'Unable to search recipes.');
              }

              renderStatus('success', payload.message || 'Search complete.');
              renderResults(payload.recipes || []);
            } catch (error) {
              renderEmptyState('Unable to load recipes right now.');
              renderStatus('error', error instanceof Error ? error.message : 'Unable to search recipes.');
            } finally {
              setSearchLoading(false);
            }
          };

          const deleteRecipe = async (recipeId) => {
            const recipe = currentRecipes.find((candidate) => String(candidate.id) === String(recipeId));
            if (!recipe) {
              renderStatus('error', 'Unable to locate the selected recipe.');
              return;
            }

            if (!window.confirm('Delete "' + recipe.name + '" from Norish?')) {
              return;
            }

            setDeleteLoading(recipeId, true);
            renderStatus('info', 'Deleting ' + recipe.name + '...');

            try {
              const response = await fetch('/tools/delete-recipe/delete', {
                method: 'POST',
                headers: {
                  'content-type': 'application/json',
                  accept: 'application/json',
                },
                body: JSON.stringify({
                  id: recipeId,
                  version: recipe.version,
                }),
              });

              const payload = await response.json().catch(() => ({}));
              if (!response.ok) {
                throw new Error(payload.message || 'Unable to delete recipe.');
              }

              currentRecipes = currentRecipes.filter((candidate) => String(candidate.id) !== String(recipeId));
              renderStatus('success', payload.message || ('Deleted ' + recipe.name + '.'));
              renderResults(currentRecipes);
            } catch (error) {
              renderStatus('error', error instanceof Error ? error.message : 'Unable to delete recipe.');
              setDeleteLoading(recipeId, false);
            }
          };

          searchButton.addEventListener('click', () => {
            void searchRecipes();
          });

          searchPanel.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') {
              return;
            }

            event.preventDefault();
            void searchRecipes();
          });

          results.addEventListener('click', (event) => {
            if (!(event.target instanceof Element)) {
              return;
            }

            const deleteButton = event.target.closest('.delete-recipe-action');
            if (!(deleteButton instanceof HTMLButtonElement)) {
              return;
            }

            const recipeId = deleteButton.getAttribute('data-recipe-id') || '';
            void deleteRecipe(recipeId);
          });

          renderEmptyState('Search for a recipe to review delete options.');
        })();
      </script>
    `,
  });

const renderToolCard = (tool: ToolDefinition) => `
  <div class="col-12 col-md-6 col-xl-3">
    <div class="card border-0 shadow-sm h-100">
      <div class="card-body p-4 d-flex flex-column">
        <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
          <h3 class="h4 mb-0">${escapeHtml(tool.title)}</h3>
          <span class="badge ${tool.status === 'live' ? 'text-bg-success' : 'text-bg-warning'} text-uppercase">${escapeHtml(tool.status)}</span>
        </div>
        <p class="text-secondary flex-grow-1">${escapeHtml(tool.summary)}</p>
        <a href="/app/tools/${encodeURIComponent(tool.slug)}" class="btn btn-outline-dark mt-3">Open</a>
      </div>
    </div>
  </div>
`;

const renderDocument = ({ title, content, activeToolSlug, showLogout = true, bodyClassName = 'bg-light' }: LayoutOptions) => `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${escapeHtml(title)} | ${escapeHtml(appName)}</title>
      <link rel="icon" type="image/svg+xml" href="/favicon.svg">
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.5/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-SgOJa3DmI69IUzQ2PVdRZhwQ+dy64/BUtbMJw1MZ8t5HZApcHrRKUc4W0kG879m7" crossorigin="anonymous">
      <style>
        body { min-height: 100vh; }
        .app-shell { min-height: 100vh; }
        .navbar-brand { letter-spacing: 0.04em; }
      </style>
    </head>
    <body class="${escapeHtml(bodyClassName)}">
      <div class="app-shell">
        <nav class="navbar navbar-expand-lg bg-white border-bottom sticky-top">
          <div class="container">
            <a class="navbar-brand fw-semibold" href="/">${escapeHtml(appName)}</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#main-nav" aria-controls="main-nav" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="main-nav">
              <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                <li class="nav-item"><a class="nav-link ${activeToolSlug === undefined ? 'active' : ''}" href="/">Home</a></li>
                ${getLiveTools(toolCatalog)
                  .map(
                    (tool) => `<li class="nav-item"><a class="nav-link ${activeToolSlug === tool.slug ? 'active' : ''}" href="/app/tools/${encodeURIComponent(tool.slug)}">${escapeHtml(tool.title)}</a></li>`,
                  )
                  .join('')}
              </ul>
              ${showLogout ? '<form method="post" action="/logout"><button type="submit" class="btn btn-outline-secondary">Log Out</button></form>' : ''}
            </div>
          </div>
        </nav>
        <main class="container py-4 py-lg-5">${content}</main>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.5/dist/js/bootstrap.bundle.min.js" integrity="sha384-k6d4wzSIapyDyv1kpU366/PK5hCdSbCRGRCMv+eplOQJWyd1fbcAu9OCUj5zNLiq" crossorigin="anonymous"></script>
    </body>
  </html>
`;

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const escapeAttribute = (value: string) => escapeHtml(value);

const getLiveTools = (tools: ToolDefinition[]) => tools.filter((tool) => tool.status === 'live');
