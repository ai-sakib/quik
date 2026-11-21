import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useBackend } from '@/backend'

/** Everyone who has signed in to the app – the people you can chat with. */
export const useUsersStore = defineStore('users', () => {
  const backend = useBackend()

  const all = ref([])
  const byId = computed(() => Object.fromEntries(all.value.map((user) => [user.id, user])))
  let unsubscribe = null

  function start() {
    unsubscribe ??= backend.users.subscribe((users) => {
      all.value = users.sort((a, b) => a.name.localeCompare(b.name))
    })
  }

  function stop() {
    unsubscribe?.()
    unsubscribe = null
    all.value = []
  }

  return { all, byId, start, stop }
})
