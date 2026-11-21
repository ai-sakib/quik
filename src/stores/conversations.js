import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useBackend } from '@/backend'
import { useAuthStore } from './auth'

export const useConversationsStore = defineStore('conversations', () => {
  const backend = useBackend()
  const auth = useAuthStore()

  const list = ref([])
  const isLoaded = ref(false)
  let unsubscribe = null

  /** Most recently active first. */
  const sorted = computed(() =>
    [...list.value].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)),
  )
  const byId = computed(() => Object.fromEntries(list.value.map((c) => [c.id, c])))

  function start() {
    unsubscribe ??= backend.conversations.subscribeForUser(auth.user.id, (conversations) => {
      list.value = conversations
      isLoaded.value = true
    })
  }

  function stop() {
    unsubscribe?.()
    unsubscribe = null
    list.value = []
    isLoaded.value = false
  }

  /** @returns {Promise<string>} the conversation id */
  function openDirect(otherUserId) {
    return backend.conversations.openDirect(auth.user.id, otherUserId)
  }

  /** @returns {Promise<string>} the conversation id */
  function createGroup(name, memberIds) {
    return backend.conversations.createGroup({
      name,
      memberIds: [auth.user.id, ...memberIds],
      createdBy: auth.user.id,
    })
  }

  return { list, sorted, byId, isLoaded, start, stop, openDirect, createGroup }
})
