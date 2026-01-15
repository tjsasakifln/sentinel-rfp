import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Button } from './button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic card with all sections.
 */
export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This is the main content area of the card.</p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * Card with only header and content.
 */
export const Simple: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Simple Card</CardTitle>
      </CardHeader>
      <CardContent>
        <p>A simple card with just a title and content.</p>
      </CardContent>
    </Card>
  ),
};

/**
 * Card with description and multiple actions.
 */
export const WithActions: Story = {
  render: () => (
    <Card className="w-[380px]">
      <CardHeader>
        <CardTitle>Project Setup</CardTitle>
        <CardDescription>Configure your project settings</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Update your project configuration to get started. This includes setting up your database,
          authentication, and deployment options.
        </p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Save Changes</Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * Card displaying a user profile.
 */
export const UserProfile: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
        <CardDescription>@johndoe</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Email:</span>
          <span className="text-sm text-muted-foreground">john.doe@example.com</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Role:</span>
          <span className="text-sm text-muted-foreground">Administrator</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Status:</span>
          <span className="text-sm text-green-600">Active</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">
          Edit Profile
        </Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * Card with statistics.
 */
export const Statistics: Story = {
  render: () => (
    <Card className="w-[300px]">
      <CardHeader className="pb-3">
        <CardTitle>Total Revenue</CardTitle>
        <CardDescription>Last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">$45,231.89</div>
        <p className="text-xs text-muted-foreground mt-1">+20.1% from last month</p>
      </CardContent>
    </Card>
  ),
};

/**
 * Card for a notification or alert.
 */
export const Notification: Story = {
  render: () => (
    <Card className="w-[380px] border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="text-lg">New Message</CardTitle>
        <CardDescription>2 minutes ago</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          You have a new message from Sarah Johnson regarding the project proposal.
        </p>
      </CardContent>
      <CardFooter className="space-x-2">
        <Button size="sm" variant="ghost">
          Dismiss
        </Button>
        <Button size="sm">View Message</Button>
      </CardFooter>
    </Card>
  ),
};
