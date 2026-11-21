import { ref, toValue, watch } from 'vue'
import { useBackend } from '@/backend'
import { useAuthStore } from '@/stores/auth'

/** Live messages of one conversation. `conversationId` can be a ref or a getter. */
export function useMessages(conversationId) {
  const backend = useBackend()
  const auth = useAuthStore()

  const messages = ref([])
  const isLoading = ref(true)

  watch(
    () => toValue(conversationId),
    (id, _previousId, onCleanup) => {
      messages.value = []
      isLoading.value = true
      if (!id) return

      const unsubscribe = backend.messages.subscribe(id, (latest) => {
        messages.value = latest
        isLoading.value = false
      })
      onCleanup(unsubscribe)
    },
    { immediate: true },
  )

  function send(text) {
    const trimmed = text.trim()
    if (!trimmed) return Promise.resolve()
    return backend.messages.send(toValue(conversationId), {
      senderId: auth.user.id,
      text: trimmed,
    })
  }

  return { messages, isLoading, send }
}
