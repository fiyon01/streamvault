-- Seed StreamVault creator rows so following does not depend on the YouTube API.
-- YOUTUBE_API_KEY is only needed later for indexing videos/durations.

insert into youtube_creators (
  channel_id,
  name,
  country,
  category,
  tags,
  is_canon,
  is_featured
) values
  ('UCvNDnMqCjXHbxIcFLSbBnOg', 'Mark Angel Comedy', 'NG', 'nigerian_comedy', array['comedy','skit','nigerian','family'], true, true),
  ('UCJEzFkFXHbDqRHlxGAlzRjA', 'AY Comedian', 'NG', 'nigerian_comedy', array['comedy','stand_up','nigerian'], true, true),
  ('UCcRpJwOsaOhbFLKV2DGQXOA', 'Basketmouth', 'NG', 'nigerian_comedy', array['comedy','stand_up','nigerian'], true, true),
  ('UCbj7QVYV2MQTXF_7ynbgfDQ', 'Churchill Show', 'KE', 'kenyan_creator', array['comedy','kenyan','stand_up','swahili'], true, true),
  ('UCjQMNUNpZZlMJFoJbLOnYnw', 'Citizen TV Kenya', 'KE', 'kenyan_creator', array['kenyan','news','drama','clips','swahili'], false, false),
  ('UC4tjY2tTltEKePusozUxtSA', 'Abel Mutua / Mkurugenzi', 'KE', 'kenyan_creator', array['storytelling','kenyan','long_form','swahili','mkurugenzi'], true, true),
  ('UCc9CjaAjsMMvaSghZB7-Kog', 'BeardMeatsFood', 'GB', 'food_travel', array['food','challenge','long_form','travel'], true, true),
  ('UCi6RNSBDQPKXqSoHJOI8MSA', 'CAF TV', 'ZA', 'sports', array['football','afcon','highlights','african'], true, true),
  ('UChi08h4577ovxyqvGMRadjg', 'Audiomack Africa', 'NG', 'music', array['afrobeats','music','afropop','interviews'], false, false)
on conflict (channel_id) do update set
  name = excluded.name,
  country = excluded.country,
  category = excluded.category,
  tags = excluded.tags,
  is_canon = excluded.is_canon,
  is_featured = excluded.is_featured,
  updated_at = now();
