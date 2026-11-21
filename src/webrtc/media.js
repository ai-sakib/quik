/** Asks for the microphone, plus the camera for video calls. */
export function getLocalMedia(kind) {
  if (!navigator.mediaDevices?.getUserMedia) {
    const error = new Error('getUserMedia is not supported')
    error.name = 'NotSupportedError'
    return Promise.reject(error)
  }
  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: kind === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
  })
}

export function stopMedia(stream) {
  stream?.getTracks().forEach((track) => track.stop())
}

export function setTracksEnabled(tracks, enabled) {
  tracks.forEach((track) => {
    track.enabled = enabled
  })
}

export function describeMediaError(error) {
  switch (error?.name) {
    case 'NotAllowedError':
      return 'Permission to use your camera or microphone was denied.'
    case 'NotFoundError':
      return 'No camera or microphone was found.'
    case 'NotReadableError':
      return 'Your camera or microphone is being used by another app.'
    case 'NotSupportedError':
      return 'Your browser does not support calls.'
    default:
      return 'Could not start the call. Please try again.'
  }
}
