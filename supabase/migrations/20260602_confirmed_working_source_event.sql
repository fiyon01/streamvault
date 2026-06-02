-- Only explicit user confirmation should count as a working playback source.
-- Iframe load means the external page opened, not that the video started.

alter table playback_source_events
  drop constraint if exists playback_source_events_event_type_check;

alter table playback_source_events
  add constraint playback_source_events_event_type_check
  check (
    event_type in (
      'attempt',
      'load',
      'confirmed_working',
      'timeout',
      'error',
      'manual_next',
      'selected',
      'reported_broken'
    )
  );
