export const THEME_MODE_VALUES = ['light', 'dark'] as const;
export type ThemeMode = (typeof THEME_MODE_VALUES)[number];

export const THEME_PRESET_VALUES = ['default', 'tangerine'] as const;
export type ThemePreset = (typeof THEME_PRESET_VALUES)[number];

export const SIDEBAR_VARIANT_VALUES = ['sidebar', 'floating', 'inset'] as const;
export type SidebarVariant = (typeof SIDEBAR_VARIANT_VALUES)[number];

export const SIDEBAR_COLLAPSIBLE_VALUES = ['offcanvas', 'icon', 'none'] as const;
export type SidebarCollapsible = (typeof SIDEBAR_COLLAPSIBLE_VALUES)[number];

export const CONTENT_LAYOUT_VALUES = ['full-width', 'centered'] as const;
export type ContentLayout = (typeof CONTENT_LAYOUT_VALUES)[number];

export const NAVBAR_STYLE_VALUES = ['sticky', 'scroll'] as const;
export type NavbarStyle = (typeof NAVBAR_STYLE_VALUES)[number];

export const THEME_PRESET_OPTIONS = THEME_PRESET_VALUES;
