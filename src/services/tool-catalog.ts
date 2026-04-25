export type ToolDefinition = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  status: 'planned' | 'live';
  highlights: string[];
};

export const toolCatalog: ToolDefinition[] = [
  {
    slug: 'calendar',
    title: 'Calendar',
    summary: 'Expose planned Norish recipes as a subscribable monthly calendar feed.',
    description:
      'The Calendar tool turns the Norish monthly planned recipe schedule into an ICS feed that can be opened directly or subscribed to from calendar clients.',
    status: 'live',
    highlights: ['monthly planned recipe export', 'ICS feed for external calendars', 'browser-accessible subscription link'],
  },
  {
    slug: 'grocy-import',
    title: 'Grocy Import',
    summary: 'Set up a Grocy connection for recipe import workflows.',
    description:
      'This tool will handle importing data from a Grocy instance into Norish. The first step is collecting the Grocy base URL and API token.',
    status: 'live',
    highlights: ['Grocy instance URL', 'Grocy API token input', 'future recipe import workflow'],
  },
  {
    slug: 'delete-recipe',
    title: 'Delete Recipe',
    summary: 'Search the Norish recipe catalog and remove recipes directly.',
    description:
      'This tool searches Norish recipes and lets you delete individual recipes from the catalog after confirmation.',
    status: 'live',
    highlights: ['recipe catalog search', 'fetch-driven results list', 'single-recipe delete action'],
  },
  {
    slug: 'create-recipe',
    title: 'Create Recipe',
    summary: 'Generate a full recipe from a dish title and import it into Norish.',
    description:
      'This tool takes a dish title, generates a complete recipe with AI, and imports the result into Norish unless an exact-name match already exists.',
    status: 'live',
    highlights: ['dish title input', 'AI recipe generation', 'duplicate-aware Norish import'],
  },
  {
    slug: 'recipes',
    title: 'Recipe Tools',
    summary: 'Import, inspect, and maintain Norish recipes.',
    description:
      'This area will hold recipe-focused utilities such as batch imports, metadata repair, duplicate detection, and workflow shortcuts around the recipe catalog.',
    status: 'planned',
    highlights: ['URL and pasted-text imports', 'recipe search workflows', 'bulk recipe maintenance'],
  },
  {
    slug: 'groceries',
    title: 'Grocery Tools',
    summary: 'Clean up and automate grocery list operations.',
    description:
      'This page is reserved for grocery-oriented jobs such as list normalization, stale-item cleanup, store assignment helpers, and bulk completion flows.',
    status: 'planned',
    highlights: ['grocery list cleanup', 'store assignment helpers', 'bulk state changes'],
  },
  {
    slug: 'planned-recipes',
    title: 'Planned Recipe Tools',
    summary: 'Manage meal-planning workflows and exports.',
    description:
      'This module will contain utilities for generating schedule views, exports, and adjustments across daily, weekly, and monthly meal plans.',
    status: 'planned',
    highlights: ['calendar-style exports', 'day and week planning helpers', 'schedule manipulation'],
  },
  {
    slug: 'stores',
    title: 'Store Tools',
    summary: 'Manage store definitions and grocery preferences.',
    description:
      'This module is the future home for store administration tasks such as normalization, ordering, icon and color curation, and assignment preferences.',
    status: 'planned',
    highlights: ['store normalization', 'sorting and presentation', 'assignment preferences'],
  },
];

export const getToolBySlug = (slug: string) => toolCatalog.find((tool) => tool.slug === slug);
