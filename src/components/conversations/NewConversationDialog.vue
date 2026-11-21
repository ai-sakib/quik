<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Check, LoaderCircle, Search } from 'lucide-vue-next'
import BaseModal from '@/components/ui/BaseModal.vue'
import UserAvatar from '@/components/ui/UserAvatar.vue'
import { useAuthStore } from '@/stores/auth'
import { useConversationsStore } from '@/stores/conversations'
import { useUsersStore } from '@/stores/users'

const emit = defineEmits(['close'])

const router = useRouter()
const auth = useAuthStore()
const users = useUsersStore()
const conversations = useConversationsStore()

const search = ref('')
const selectedIds = ref([])
const groupName = ref('')
const isSaving = ref(false)
const error = ref(null)

const isGroup = computed(() => selectedIds.value.length > 1)
const canSubmit = computed(
  () => selectedIds.value.length > 0 && (!isGroup.value || groupName.value.trim()),
)

const otherUsers = computed(() => {
  const term = search.value.trim().toLowerCase()
  return users.all.filter(
    (user) =>
      user.id !== auth.user.id &&
      (!term || user.name.toLowerCase().includes(term) || user.email?.toLowerCase().includes(term)),
  )
})

function toggle(userId) {
  selectedIds.value = selectedIds.value.includes(userId)
    ? selectedIds.value.filter((id) => id !== userId)
    : [...selectedIds.value, userId]
}

async function submit() {
  if (!canSubmit.value || isSaving.value) return
  isSaving.value = true
  error.value = null

  try {
    const conversationId = isGroup.value
      ? await conversations.createGroup(groupName.value.trim(), selectedIds.value)
      : await conversations.openDirect(selectedIds.value[0])
    emit('close')
    router.push({ name: 'conversation', params: { conversationId } })
  } catch (saveError) {
    console.error('[conversations] could not create conversation', saveError)
    error.value = 'Could not create the conversation. Please try again.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <BaseModal title="New conversation" @close="emit('close')">
    <form class="flex min-h-0 flex-1 flex-col" @submit.prevent="submit">
      <div class="space-y-3 px-6">
        <label class="relative block">
          <span class="sr-only">Search people</span>
          <Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            v-model="search"
            type="search"
            placeholder="Search people"
            class="w-full rounded-xl border-0 bg-slate-100 py-2.5 pr-3 pl-9 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>

        <label v-if="isGroup" class="block">
          <span class="mb-1 block text-xs font-medium text-slate-500">Group name</span>
          <input
            v-model="groupName"
            type="text"
            maxlength="60"
            placeholder="e.g. Weekend plans"
            class="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </label>
      </div>

      <ul class="thin-scrollbar mt-3 min-h-40 flex-1 overflow-y-auto px-3" aria-label="People">
        <li v-for="user in otherUsers" :key="user.id">
          <button
            type="button"
            role="checkbox"
            :aria-checked="selectedIds.includes(user.id)"
            class="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-slate-100"
            @click="toggle(user.id)"
          >
            <UserAvatar :name="user.name" :photo-url="user.photoURL" />
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium">{{ user.name }}</span>
              <span class="block truncate text-xs text-slate-500">{{ user.email }}</span>
            </span>
            <span
              :class="[
                'flex size-5 items-center justify-center rounded-full border transition',
                selectedIds.includes(user.id)
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-300',
              ]"
            >
              <Check v-if="selectedIds.includes(user.id)" class="size-3.5" />
            </span>
          </button>
        </li>
        <li v-if="otherUsers.length === 0" class="px-3 py-10 text-center text-sm text-slate-500">
          {{
            search
              ? 'Nobody matches your search.'
              : 'No one else here yet. Invite a friend to sign in!'
          }}
        </li>
      </ul>

      <footer class="border-t border-slate-100 px-6 py-4">
        <p v-if="error" role="alert" class="mb-3 text-sm text-rose-600">{{ error }}</p>
        <button
          type="submit"
          :disabled="!canSubmit || isSaving"
          class="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          <LoaderCircle v-if="isSaving" class="size-4 animate-spin" />
          {{ isGroup ? `Create group (${selectedIds.length + 1} people)` : 'Start chat' }}
        </button>
      </footer>
    </form>
  </BaseModal>
</template>
