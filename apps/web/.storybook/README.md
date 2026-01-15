# Storybook - Sentinel RFP Component Documentation

This directory contains the Storybook configuration for the Sentinel RFP web application.

## Overview

Storybook is a development environment and component showcase for UI components. It allows you to:

- Develop components in isolation
- Visualize different component states
- Test component interactions
- Generate component documentation automatically
- Share components with designers and stakeholders

## Running Storybook

### Development Mode

Start the Storybook development server:

```bash
# From the web app directory
cd apps/web
pnpm storybook

# Or from root with Turbo
pnpm turbo storybook --filter=@sentinel-rfp/web
```

This will start Storybook on `http://localhost:6006`

### Build Storybook

Build a static version of Storybook for deployment:

```bash
# From the web app directory
cd apps/web
pnpm build-storybook

# Or from root with Turbo
pnpm turbo build-storybook --filter=@sentinel-rfp/web
```

The output will be in `apps/web/storybook-static/`

## Configuration Files

### `main.ts`

Main configuration file that defines:

- **Stories location**: `../src/**/*.stories.@(js|jsx|mjs|ts|tsx)`
- **Addons**: Chromatic, Vitest, A11y, Docs, Onboarding
- **Framework**: Next.js with Vite

### `preview.ts`

Preview configuration that:

- Imports global CSS (`../app/globals.css`) for Tailwind styles
- Configures controls matchers for color and date pickers
- Sets up accessibility testing parameters

### `vitest.setup.ts`

Configuration for Vitest integration with Storybook stories.

## Creating Stories

### Story File Naming

Stories should be placed next to the component file with the `.stories.tsx` extension:

```
components/ui/
├── button.tsx
├── button.stories.tsx  # ← Story file
├── input.tsx
└── input.stories.tsx   # ← Story file
```

### Basic Story Template

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { YourComponent } from './your-component';

const meta = {
  title: 'UI/YourComponent',
  component: YourComponent,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
      description: 'Component variant',
    },
  },
} satisfies Meta<typeof YourComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Default',
  },
};

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary',
  },
};
```

### Story Examples

The following components have stories created:

- **Button** (`components/ui/button.stories.tsx`)
  - Default, Destructive, Outline, Secondary, Ghost, Link variants
  - Small, Large, Icon sizes
  - Disabled state
  - With icon example

- **Input** (`components/ui/input.stories.tsx`)
  - Text, Email, Password, Number, Search, File, Date types
  - Disabled state
  - With default value
  - Required field

- **Card** (`components/ui/card.stories.tsx`)
  - Default with all sections
  - Simple layout
  - With actions (footer buttons)
  - User profile example
  - Statistics display
  - Notification card

## Best Practices

### 1. Document Component Variants

Show all possible variants and states of your component:

```typescript
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <Button variant="default">Default</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  ),
};
```

### 2. Use ArgTypes for Interactive Controls

Define argTypes to make your stories interactive in Storybook:

```typescript
argTypes: {
  disabled: {
    control: 'boolean',
  },
  size: {
    control: 'select',
    options: ['sm', 'md', 'lg'],
  },
}
```

### 3. Add JSDoc Comments

Use JSDoc comments in your story exports for better documentation:

```typescript
/**
 * The primary variant is used for main actions.
 */
export const Primary: Story = {
  // ...
};
```

### 4. Test Accessibility

Storybook includes the A11y addon. Check the "Accessibility" tab for violations.

### 5. Use Autodocs

Add `tags: ['autodocs']` to auto-generate documentation from your stories.

## Addons Included

### @chromatic-com/storybook

Visual regression testing integration with Chromatic.

### @storybook/addon-vitest

Run component tests directly from your stories using Vitest.

### @storybook/addon-a11y

Accessibility testing tool that highlights violations and provides remediation suggestions.

### @storybook/addon-docs

Auto-generates documentation from your stories and component definitions.

### @storybook/addon-onboarding

Interactive onboarding guide for new Storybook users (can be disabled in production).

## Tailwind CSS Integration

Tailwind CSS is automatically imported via `preview.ts`. All Tailwind classes will work in your stories.

## Next Steps

1. **Create more stories**: Add stories for other shadcn/ui components (Badge, Select, Table, etc.)
2. **Document complex components**: Create stories for page-level components (Dashboard, ProposalEditor, etc.)
3. **Test interactions**: Use `@storybook/addon-interactions` to test user workflows
4. **Visual regression**: Set up Chromatic for automated visual testing
5. **Deploy Storybook**: Host built Storybook on Vercel, Netlify, or Chromatic

## Resources

- [Storybook Documentation](https://storybook.js.org/docs)
- [Next.js with Storybook](https://storybook.js.org/docs/get-started/nextjs)
- [Writing Stories](https://storybook.js.org/docs/writing-stories)
- [Accessibility Testing](https://storybook.js.org/docs/writing-tests/accessibility-testing)
- [shadcn/ui Components](https://ui.shadcn.com/)
