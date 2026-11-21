import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { useBackend } from '@/backend'
import { getIceServers } from '@/webrtc/iceServers'
import { describeMediaError, getLocalMedia, setTracksEnabled, stopMedia } from '@/webrtc/media'
import { startMeshCall } from '@/webrtc/meshCall'
import { useAuthStore } from './auth'
import { useConversationsStore } from './conversations'

/** A call that started longer ago than this no longer rings (but can still be joined). */
export const RING_DURATION_MS = 45_000

export const useCallStore = defineStore('call', () => {
  const backend = useBackend()
  const auth = useAuthStore()
  const conversations = useConversationsStore()

  const status = ref('idle') // 'idle' | 'joining' | 'connected'
  const callId = ref(null)
  const conversationId = ref(null)
  const kind = ref('video') // 'video' | 'audio'
  const localStream = shallowRef(null)
  const remoteStreams = shallowRef({}) // userId -> MediaStream
  const isMicOn = ref(true)
  const isCameraOn = ref(true)
  const error = ref(null)
  const dismissedCallIds = ref([])

  let meshCall = null
  let stopWatchingCall = null

  const isActive = computed(() => status.value !== 'idle')
  const conversation = computed(() => conversations.byId[conversationId.value] ?? null)

  /** A call in one of my conversations that someone else started and I haven't answered yet. */
  const incomingCall = computed(() => {
    const ringing = conversations.sorted.find(({ activeCall }) => isRinging(activeCall))
    return ringing ? { ...ringing.activeCall, conversation: ringing } : null
  })

  function isRinging(activeCall) {
    return (
      activeCall != null &&
      activeCall.startedBy !== auth.user?.id &&
      activeCall.id !== callId.value &&
      !dismissedCallIds.value.includes(activeCall.id) &&
      Date.now() - (activeCall.startedAt ?? Date.now()) < RING_DURATION_MS
    )
  }

  /** Starts a new call in the conversation, or joins the one already running there. */
  function startCall(targetConversation, callKind) {
    if (targetConversation.activeCall) return joinCall(targetConversation)
    return enterCall(targetConversation, callKind, null)
  }

  function joinCall(targetConversation) {
    const { id, kind: callKind } = targetConversation.activeCall
    return enterCall(targetConversation, callKind, id)
  }

  async function enterCall(targetConversation, callKind, existingCallId) {
    if (isActive.value) return

    status.value = 'joining'
    error.value = null
    conversationId.value = targetConversation.id
    kind.value = callKind
    isMicOn.value = true
    isCameraOn.value = callKind === 'video'

    try {
      // Ask for camera/mic first, so we never ring people if permission is denied.
      localStream.value = await getLocalMedia(callKind)
      callId.value =
        existingCallId ??
        (await backend.calls.start({
          conversation: targetConversation,
          kind: callKind,
          startedBy: auth.user.id,
        }))
      dismiss(callId.value) // don't ring for this call after we leave it

      const channel = await backend.calls.join(callId.value, auth.user.id)
      meshCall = startMeshCall({
        channel,
        localStream: localStream.value,
        iceServers: getIceServers(),
        onRemoteStream: addRemoteStream,
        onPeerLeft: removeRemoteStream,
      })
      stopWatchingCall = backend.calls.subscribe(callId.value, (call) => {
        if (call.status === 'ended') leave()
      })
      status.value = 'connected'
    } catch (callError) {
      console.error('[call] could not start the call', callError)
      error.value = describeMediaError(callError)
      const failedCallId = callId.value
      await leave()
      if (failedCallId && !existingCallId) await endCall(failedCallId)
    }
  }

  /** Leaves the call. Other people in a group call stay connected. */
  async function leave() {
    if (!isActive.value) return

    const endingMeshCall = meshCall
    stopWatchingCall?.()
    stopMedia(localStream.value)

    meshCall = null
    stopWatchingCall = null
    status.value = 'idle'
    callId.value = null
    conversationId.value = null
    localStream.value = null
    remoteStreams.value = {}

    await endingMeshCall?.hangUp().catch((hangUpError) => console.error('[call]', hangUpError))
  }

  /** The red button: a 1:1 call ends for both people, a group call only for me. */
  async function hangUp() {
    const endingCallId = callId.value
    const isDirect = conversation.value?.type === 'direct'
    await leave()
    if (isDirect && endingCallId) await endCall(endingCallId)
  }

  async function decline(call) {
    dismiss(call.id)
    if (call.conversation.type === 'direct') await endCall(call.id)
  }

  function dismiss(id) {
    if (!dismissedCallIds.value.includes(id)) dismissedCallIds.value.push(id)
  }

  function endCall(id) {
    return backend.calls.end(id).catch((endError) => console.error('[call]', endError))
  }

  function toggleMic() {
    isMicOn.value = !isMicOn.value
    setTracksEnabled(localStream.value?.getAudioTracks() ?? [], isMicOn.value)
  }

  function toggleCamera() {
    isCameraOn.value = !isCameraOn.value
    setTracksEnabled(localStream.value?.getVideoTracks() ?? [], isCameraOn.value)
  }

  function addRemoteStream(userId, stream) {
    if (remoteStreams.value[userId] === stream) return
    remoteStreams.value = { ...remoteStreams.value, [userId]: stream }
  }

  function removeRemoteStream(userId) {
    const remaining = { ...remoteStreams.value }
    delete remaining[userId]
    remoteStreams.value = remaining
  }

  return {
    status,
    callId,
    kind,
    conversation,
    localStream,
    remoteStreams,
    isMicOn,
    isCameraOn,
    error,
    isActive,
    incomingCall,
    startCall,
    joinCall,
    leave,
    hangUp,
    decline,
    dismiss,
    toggleMic,
    toggleCamera,
  }
})
