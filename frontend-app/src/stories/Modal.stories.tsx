/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "PolyForm-Noncommercial-1.0.0.txt" for full text.
 *
 * COMMUNITY RIGHTS:
 * - You CAN modify this code for personal use.
 * - You CAN build and share widgets/plugins for the ecosystem.
 *
 * RESTRICTIONS:
 * - You CANNOT resell, repackage, or distribute this application for a fee.
 * - You CANNOT use this application for commercial enterprise purposes.
 */

// Updated 2025-12-10 14:58 CST by ChatGPT
import type { Meta, StoryObj } from '@storybook/react'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  tags: ['autodocs'],
  argTypes: {
    onClose: { action: 'closed' },
    open: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Modal>

export const Basic: Story = {
  args: {
    open: true,
    title: 'Session timeout',
    children: 'You will be logged out after 1 minute of inactivity.',
  },
}

export const WithFooter: Story = {
  args: {
    open: true,
    title: 'Delete account',
    children: 'This action cannot be undone.',
  },
  render: (args) => (
    <Modal
      {...args}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" size="sm">
            Cancel
          </Button>
          <Button variant="accent" size="sm">
            Confirm
          </Button>
        </div>
      }
    />
  ),
}

export const Closed: Story = {
  args: {
    open: false,
    title: 'Hidden modal',
    children: 'This content should not render when open is false.',
  },
}
