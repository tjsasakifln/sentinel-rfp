import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Input } from './input';

const meta = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date', 'file'],
      description: 'The type of input',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the input is disabled',
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default text input.
 */
export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

/**
 * Email input with validation.
 */
export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'Enter your email',
  },
};

/**
 * Password input with obscured text.
 */
export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter your password',
  },
};

/**
 * Number input with numeric keyboard on mobile.
 */
export const Number: Story = {
  args: {
    type: 'number',
    placeholder: 'Enter a number',
  },
};

/**
 * Search input for search functionality.
 */
export const Search: Story = {
  args: {
    type: 'search',
    placeholder: 'Search...',
  },
};

/**
 * File input for uploading files.
 */
export const File: Story = {
  args: {
    type: 'file',
  },
};

/**
 * Date input with native date picker.
 */
export const Date: Story = {
  args: {
    type: 'date',
  },
};

/**
 * Disabled input that cannot be edited.
 */
export const Disabled: Story = {
  args: {
    placeholder: 'Disabled input',
    disabled: true,
  },
};

/**
 * Input with default value.
 */
export const WithValue: Story = {
  args: {
    defaultValue: 'John Doe',
    placeholder: 'Enter your name',
  },
};

/**
 * Input with required attribute.
 */
export const Required: Story = {
  args: {
    placeholder: 'Required field',
    required: true,
  },
};
