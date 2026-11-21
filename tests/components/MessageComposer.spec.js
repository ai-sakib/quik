import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import MessageComposer from '@/components/chat/MessageComposer.vue'

function setup() {
  const result = render(MessageComposer)
  return { ...result, user: userEvent.setup(), input: screen.getByLabelText('Message') }
}

describe('MessageComposer', () => {
  it('sends the trimmed message on Enter and clears the input', async () => {
    const { user, input, emitted } = setup()

    await user.type(input, '  Hello there  {Enter}')

    expect(emitted().send).toEqual([['Hello there']])
    expect(input).toHaveValue('')
  })

  it('adds a new line on Shift+Enter instead of sending', async () => {
    const { user, input, emitted } = setup()

    await user.type(input, 'Line 1{Shift>}{Enter}{/Shift}Line 2')

    expect(emitted().send).toBeUndefined()
    expect(input).toHaveValue('Line 1\nLine 2')
  })

  it('sends with the send button', async () => {
    const { user, input, emitted } = setup()

    await user.type(input, 'Hi')
    await user.click(screen.getByRole('button', { name: 'Send message' }))

    expect(emitted().send).toEqual([['Hi']])
  })

  it('does not send empty messages', async () => {
    const { user, input, emitted } = setup()

    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
    await user.type(input, '   {Enter}')

    expect(emitted().send).toBeUndefined()
  })
})
