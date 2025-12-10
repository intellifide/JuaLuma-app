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
