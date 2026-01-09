// Export all Sanity utilities and types
export { sanityFetch } from './fetch';
export { client } from './client';
export { urlForImage, resolveOpenGraphImage, resolveHref } from './utils';
export { 
  settingsQuery, 
  heroQuery, 
  moreStoriesQuery, 
  postQuery 
} from './queries';
export { apiVersion, dataset, projectId, studioUrl } from './api';
export { token } from './token';

// Export all types including query result types
export type * from './sanity.types';

// Re-export commonly used types for convenience
export type {
  SettingsQueryResult,
  HeroQueryResult,
  MoreStoriesQueryResult,
  PostQueryResult,
  PostSlugsResult,
  Post,
  Author,
  Settings,
} from './sanity.types';
