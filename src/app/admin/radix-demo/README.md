# Radix UI Demo

This demo page showcases Radix UI primitives that are ready for integration into Spectacl.

## Access the Demo

Visit: `http://localhost:3000/radix-demo`

## Colors

### **Custom Lime-Gray Palette**

A 12-step color scale based on Radix Colors, optimized for accessibility and consistency.

| Steps | Lime (Accent)  | Gray (Neutral) | Purpose                |
| ----- | -------------- | -------------- | ---------------------- |
| 1-2   | `--lime-1/2`   | `--gray-1/2`   | Backgrounds            |
| 3-5   | `--lime-3-5`   | `--gray-3-5`   | Interactive components |
| 6-8   | `--lime-6-8`   | `--gray-6-8`   | Borders & separators   |
| 9-10  | `--lime-9/10`  | `--gray-9/10`  | Solid colors (buttons) |
| 11-12 | `--lime-11/12` | `--gray-11/12` | Text                   |

**Usage:**

```css
/* Primary button */
background-color: var(--lime-9);
color: var(--lime-contrast);

/* Secondary button */
background-color: var(--lime-3);
border-color: var(--lime-6);
color: var(--lime-11);
```

**Setup:** Import `@/styles/radix-colors.css` in your layout or component.

- **Package**: `@radix-ui/colors`
- **File**: `/src/styles/radix-colors.css`

## Icons

### **Radix Icons**

- **250+ icons** at 15x15 pixel size
- **Categories**: Navigation, Actions, Status, Toggle States, Data, Special
- **Styling**: Inherits text color, scalable with Tailwind classes
- **Package**: `@radix-ui/react-icons`

## Components Included

### 1. **Tabs**

- **Use cases**: Settings pages, multi-view interfaces
- **Current usage**: Could replace manual tab implementations
- **Package**: `@radix-ui/react-tabs`

### 2. **Select**

- **Use cases**: Model selection, entity selection, status dropdowns
- **Current usage**: Replace `EntitySelector`, `TargetModelsSelector`
- **Package**: `@radix-ui/react-select`

### 3. **Dropdown Menu**

- **Use cases**: Action menus, context menus, user menus
- **Current usage**: Table row actions, header menus
- **Package**: `@radix-ui/react-dropdown-menu`

### 4. **Dialog (Modal)**

- **Use cases**: Confirmation dialogs, forms, detailed views
- **Current usage**: Replace existing modal implementations
- **Package**: `@radix-ui/react-dialog`

### 5. **Popover**

- **Use cases**: Filter panels, quick settings, additional info
- **Current usage**: Filter dropdowns, inline editors
- **Package**: `@radix-ui/react-popover`

### 6. **Switch**

- **Use cases**: Settings toggles, feature flags
- **Current usage**: Enable/disable features, notification settings
- **Package**: `@radix-ui/react-switch`

### 7. **Checkbox**

- **Use cases**: Multi-select, agreement forms
- **Current usage**: Bulk actions, filter selections
- **Package**: `@radix-ui/react-checkbox`

### 8. **Tooltip**

- **Use cases**: Help text, icon explanations
- **Current usage**: Throughout the app for contextual help
- **Package**: `@radix-ui/react-tooltip`

### 9. **Accordion**

- **Use cases**: FAQs, collapsible sections, settings groups
- **Current usage**: Dismissed prompts, advanced settings
- **Package**: `@radix-ui/react-accordion`

### 10. **Radio Group**

- **Use cases**: Intent selection, plan selection, single-choice options
- **Current usage**: Prompt intent selection, plan tier selection
- **Package**: `@radix-ui/react-radio-group`

### 11. **Slider**

- **Use cases**: Volume controls, price ranges, confidence thresholds
- **Current usage**: Analysis frequency settings, filter ranges
- **Package**: `@radix-ui/react-slider`

### 12. **Progress**

- **Use cases**: Analysis progress, upload status, loading indicators
- **Current usage**: Batch analysis progress, data export progress
- **Package**: `@radix-ui/react-progress`

### 13. **Separator**

- **Use cases**: Visual dividers, section breaks, menu separators
- **Current usage**: Throughout the app for visual organization
- **Package**: `@radix-ui/react-separator`

### 14. **Context Menu**

- **Use cases**: Right-click actions, table row actions, card actions
- **Current usage**: Quick actions on prompts, results, entities
- **Package**: `@radix-ui/react-context-menu`

### 15. **Alert Dialog**

- **Use cases**: Destructive actions, confirmations, critical alerts
- **Current usage**: Delete confirmations, irreversible actions
- **Package**: `@radix-ui/react-alert-dialog`

## Migration Strategy

### Phase 1: Create Wrapper Components (Recommended)

Create reusable wrapper components in `/src/components/UI/`:

- `Dropdown.tsx` - Wraps Radix Select
- `Menu.tsx` - Wraps Radix Dropdown Menu
- `Modal.tsx` - Wraps Radix Dialog
- etc.

### Phase 2: Gradual Migration

1. Start with new features using Radix components
2. Migrate simple components first (tooltips, switches)
3. Then tackle complex ones (selectors, modals)
4. Keep old components until migration is complete

### Phase 3: Cleanup

- Remove old custom implementations
- Update documentation
- Standardize styling

## Benefits

✅ **Accessibility**: WCAG compliant out of the box
✅ **Keyboard Navigation**: Full keyboard support
✅ **Focus Management**: Automatic focus trapping
✅ **Portal Rendering**: No z-index issues
✅ **Collision Detection**: Smart positioning
✅ **Customizable**: Full control over styling
✅ **Battle-tested**: Used by Vercel, Stripe, Linear

## Installed Packages

```json
{
  "@radix-ui/react-select": "latest",
  "@radix-ui/react-dropdown-menu": "latest",
  "@radix-ui/react-dialog": "latest",
  "@radix-ui/react-popover": "latest",
  "@radix-ui/react-tooltip": "latest",
  "@radix-ui/react-switch": "latest",
  "@radix-ui/react-checkbox": "latest",
  "@radix-ui/react-tabs": "latest",
  "@radix-ui/react-accordion": "latest",
  "@radix-ui/react-radio-group": "latest",
  "@radix-ui/react-slider": "latest",
  "@radix-ui/react-progress": "latest",
  "@radix-ui/react-separator": "latest",
  "@radix-ui/react-context-menu": "latest",
  "@radix-ui/react-alert-dialog": "latest"
}
```

## Next Steps

1. **Explore the demo** at `/radix-demo`
2. **Identify components** to migrate first
3. **Create wrapper components** for consistency
4. **Gradually integrate** into existing pages
5. **Document patterns** for team consistency

## Resources

- [Radix UI Documentation](https://www.radix-ui.com/primitives)
- [Radix UI GitHub](https://github.com/radix-ui/primitives)
- [Examples & Patterns](https://www.radix-ui.com/primitives/docs/overview/getting-started)
