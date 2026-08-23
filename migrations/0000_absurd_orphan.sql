CREATE TABLE `alert_dispatches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`alert_type` text NOT NULL,
	`race_id` integer,
	`saved_search_id` integer,
	`race_alert_id` integer,
	`dispatch_key` text NOT NULL,
	`unsub_token` text NOT NULL,
	`track_token` text NOT NULL,
	`email_subject` text,
	`email_to` text,
	`match_count` integer,
	`dispatched_at` integer DEFAULT (unixepoch() * 1000),
	`opened_at` integer,
	`clicked_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`race_id`) REFERENCES `races`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`saved_search_id`) REFERENCES `saved_searches`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`race_alert_id`) REFERENCES `race_alerts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `alert_dispatches_dispatch_key_unique` ON `alert_dispatches` (`dispatch_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `alert_dispatches_unsub_token_unique` ON `alert_dispatches` (`unsub_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `alert_dispatches_track_token_unique` ON `alert_dispatches` (`track_token`);--> statement-breakpoint
CREATE INDEX `alert_dispatches_user_idx` ON `alert_dispatches` (`user_id`);--> statement-breakpoint
CREATE INDEX `alert_dispatches_type_idx` ON `alert_dispatches` (`alert_type`);--> statement-breakpoint
CREATE INDEX `alert_dispatches_dispatched_idx` ON `alert_dispatches` (`dispatched_at`);--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`organizer_id` integer,
	`name` text NOT NULL,
	`key_hash` text NOT NULL,
	`key_prefix` text NOT NULL,
	`tier` text DEFAULT 'free' NOT NULL,
	`monthly_limit` integer DEFAULT 1000 NOT NULL,
	`monthly_usage` integer DEFAULT 0 NOT NULL,
	`monthly_reset_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_used_at` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organizer_id`) REFERENCES `organizers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_hash_unique` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `api_keys_user_idx` ON `api_keys` (`user_id`);--> statement-breakpoint
CREATE INDEX `api_keys_hash_idx` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `api_keys_status_idx` ON `api_keys` (`status`);--> statement-breakpoint
CREATE TABLE `books` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`author` text NOT NULL,
	`description` text,
	`category` text,
	`publish_year` integer,
	`pages` integer,
	`amazon_url` text,
	`website` text,
	`image_url` text,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `books_slug_unique` ON `books` (`slug`);--> statement-breakpoint
CREATE TABLE `cities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`state_id` integer NOT NULL,
	`lat` real,
	`lng` real,
	`population` integer,
	FOREIGN KEY (`state_id`) REFERENCES `states`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cities_slug_state_idx` ON `cities` (`slug`,`state_id`);--> statement-breakpoint
CREATE INDEX `cities_state_idx` ON `cities` (`state_id`);--> statement-breakpoint
CREATE TABLE `collections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text DEFAULT 'races' NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`title_template` text,
	`description` text,
	`query_json` text,
	`is_programmatic` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collections_slug_unique` ON `collections` (`slug`);--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`item_type` text NOT NULL,
	`item_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `favorites_user_item_idx` ON `favorites` (`user_id`,`item_type`,`item_id`);--> statement-breakpoint
CREATE INDEX `favorites_user_idx` ON `favorites` (`user_id`);--> statement-breakpoint
CREATE TABLE `featured_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`race_id` integer NOT NULL,
	`organizer_id` integer,
	`user_id` integer,
	`contact_email` text NOT NULL,
	`message` text,
	`plan` text DEFAULT 'featured' NOT NULL,
	`duration_days` integer DEFAULT 30 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`admin_note` text,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	`reviewed_at` integer,
	FOREIGN KEY (`race_id`) REFERENCES `races`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organizer_id`) REFERENCES `organizers`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `featured_requests_race_idx` ON `featured_requests` (`race_id`);--> statement-breakpoint
CREATE INDEX `featured_requests_status_idx` ON `featured_requests` (`status`);--> statement-breakpoint
CREATE TABLE `influencers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`handle` text NOT NULL,
	`platform` text NOT NULL,
	`bio` text,
	`followers` text,
	`specialty` text,
	`website` text,
	`image_url` text,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `influencers_slug_unique` ON `influencers` (`slug`);--> statement-breakpoint
CREATE TABLE `magic_link_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `magic_link_tokens_token_unique` ON `magic_link_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `magic_link_tokens_token_idx` ON `magic_link_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `magic_link_tokens_email_idx` ON `magic_link_tokens` (`email`);--> statement-breakpoint
CREATE TABLE `market_report_access` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`scope` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `market_report_access_user_idx` ON `market_report_access` (`user_id`);--> statement-breakpoint
CREATE INDEX `market_report_access_scope_idx` ON `market_report_access` (`scope`);--> statement-breakpoint
CREATE TABLE `market_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`metro_slug` text NOT NULL,
	`distance` text NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`data` text NOT NULL,
	`generated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `market_reports_metro_distance_idx` ON `market_reports` (`metro_slug`,`distance`);--> statement-breakpoint
CREATE TABLE `monetization_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`organizer_id` integer,
	`user_id` integer,
	`contact_email` text NOT NULL,
	`contact_name` text,
	`scope` text,
	`message` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`admin_note` text,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	`reviewed_at` integer,
	FOREIGN KEY (`organizer_id`) REFERENCES `organizers`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `monetization_requests_kind_idx` ON `monetization_requests` (`kind`);--> statement-breakpoint
CREATE INDEX `monetization_requests_status_idx` ON `monetization_requests` (`status`);--> statement-breakpoint
CREATE TABLE `organizers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`website` text,
	`email` text,
	`contact_name` text,
	`phone` text,
	`city` text,
	`state` text,
	`description` text,
	`logo_url` text,
	`is_verified` integer DEFAULT false NOT NULL,
	`race_count` integer DEFAULT 0 NOT NULL,
	`pro_until` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizers_slug_unique` ON `organizers` (`slug`);--> statement-breakpoint
CREATE INDEX `organizers_state_idx` ON `organizers` (`state`);--> statement-breakpoint
CREATE TABLE `outbound_clicks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`race_id` integer,
	`organizer_id` integer,
	`user_id` integer,
	`session_id` text,
	`destination` text NOT NULL,
	`target_url` text NOT NULL,
	`referer` text,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`race_id`) REFERENCES `races`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organizer_id`) REFERENCES `organizers`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `outbound_clicks_race_idx` ON `outbound_clicks` (`race_id`);--> statement-breakpoint
CREATE INDEX `outbound_clicks_organizer_idx` ON `outbound_clicks` (`organizer_id`);--> statement-breakpoint
CREATE INDEX `outbound_clicks_created_idx` ON `outbound_clicks` (`created_at`);--> statement-breakpoint
CREATE TABLE `podcasts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`host` text NOT NULL,
	`description` text,
	`category` text,
	`episode_count` text,
	`website` text,
	`spotify_url` text,
	`apple_url` text,
	`image_url` text,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `podcasts_slug_unique` ON `podcasts` (`slug`);--> statement-breakpoint
CREATE TABLE `race_alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`race_id` integer NOT NULL,
	`alert_type` text NOT NULL,
	`threshold` integer,
	`last_notified_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`race_id`) REFERENCES `races`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `race_alerts_user_race_type_idx` ON `race_alerts` (`user_id`,`race_id`,`alert_type`);--> statement-breakpoint
CREATE INDEX `race_alerts_user_idx` ON `race_alerts` (`user_id`);--> statement-breakpoint
CREATE TABLE `race_claims` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`race_id` integer NOT NULL,
	`organizer_id` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`claimer_email` text NOT NULL,
	`claimer_name` text,
	`claimer_role` text,
	`message` text,
	`verification_token` text,
	`verified_at` integer,
	`reviewed_at` integer,
	`reviewer_note` text,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`race_id`) REFERENCES `races`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organizer_id`) REFERENCES `organizers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `race_claims_verification_token_unique` ON `race_claims` (`verification_token`);--> statement-breakpoint
CREATE INDEX `race_claims_race_idx` ON `race_claims` (`race_id`);--> statement-breakpoint
CREATE INDEX `race_claims_status_idx` ON `race_claims` (`status`);--> statement-breakpoint
CREATE INDEX `race_claims_token_idx` ON `race_claims` (`verification_token`);--> statement-breakpoint
CREATE TABLE `race_field_provenance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`race_id` integer NOT NULL,
	`field_name` text NOT NULL,
	`source_key` text NOT NULL,
	`value` text,
	`confidence` integer DEFAULT 100 NOT NULL,
	`observed_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`race_id`) REFERENCES `races`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `race_field_provenance_unique_idx` ON `race_field_provenance` (`race_id`,`field_name`,`source_key`);--> statement-breakpoint
CREATE INDEX `race_field_provenance_race_idx` ON `race_field_provenance` (`race_id`);--> statement-breakpoint
CREATE TABLE `race_occurrences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`race_id` integer NOT NULL,
	`start_date` text NOT NULL,
	`start_time` text,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`price_min` integer,
	`price_max` integer,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`course_elevation_gain_m` integer,
	`course_profile_url` text,
	`last_modified_at` integer DEFAULT (unixepoch() * 1000),
	`source_best_id` integer,
	FOREIGN KEY (`race_id`) REFERENCES `races`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `race_occurrences_race_idx` ON `race_occurrences` (`race_id`);--> statement-breakpoint
CREATE INDEX `race_occurrences_year_idx` ON `race_occurrences` (`year`);--> statement-breakpoint
CREATE INDEX `race_occurrences_year_month_idx` ON `race_occurrences` (`year`,`month`);--> statement-breakpoint
CREATE INDEX `race_occurrences_date_idx` ON `race_occurrences` (`start_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `race_occurrences_race_start_uniq` ON `race_occurrences` (`race_id`,`start_date`);--> statement-breakpoint
CREATE TABLE `race_page_views` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`race_id` integer NOT NULL,
	`day` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`race_id`) REFERENCES `races`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `race_page_views_race_day_idx` ON `race_page_views` (`race_id`,`day`);--> statement-breakpoint
CREATE INDEX `race_page_views_race_idx` ON `race_page_views` (`race_id`);--> statement-breakpoint
CREATE INDEX `race_page_views_day_idx` ON `race_page_views` (`day`);--> statement-breakpoint
CREATE TABLE `race_series` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`website` text,
	`organizer_id` integer,
	`logo_url` text,
	`race_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`organizer_id`) REFERENCES `organizers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `race_series_slug_unique` ON `race_series` (`slug`);--> statement-breakpoint
CREATE TABLE `races` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`date` text NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`distance` text NOT NULL,
	`surface` text NOT NULL,
	`elevation` text NOT NULL,
	`description` text,
	`website` text,
	`registration_url` text,
	`start_time` text,
	`time_limit` text,
	`boston_qualifier` integer DEFAULT false,
	`city_id` integer,
	`state_id` integer,
	`distance_meters` integer,
	`distance_label` text,
	`lat` real,
	`lng` real,
	`is_active` integer DEFAULT true NOT NULL,
	`quality_score` integer DEFAULT 50 NOT NULL,
	`first_seen_at` integer DEFAULT (unixepoch() * 1000),
	`last_seen_at` integer DEFAULT (unixepoch() * 1000),
	`organizer_id` integer,
	`series_id` integer,
	`price_min` integer,
	`price_max` integer,
	`price_currency` text DEFAULT 'USD',
	`registration_open` integer,
	`registration_deadline` text,
	`next_price_increase_at` text,
	`next_price_increase_amount` integer,
	`terrain` text,
	`elevation_gain_m` integer,
	`course_type` text,
	`course_map_url` text,
	`elevation_profile_url` text,
	`field_size` integer,
	`refund_policy` text,
	`deferral_policy` text,
	`packet_pickup` text,
	`parking_notes` text,
	`transit_friendly` integer,
	`walker_friendly` integer,
	`stroller_friendly` integer,
	`dog_friendly` integer,
	`kids_race` integer,
	`charity` integer,
	`charity_partner` text,
	`vibe_tags` text DEFAULT '[]' NOT NULL,
	`is_turkey_trot` integer DEFAULT false NOT NULL,
	`is_halloween` integer DEFAULT false NOT NULL,
	`is_jingle_bell` integer DEFAULT false NOT NULL,
	`recurrence_pattern` text,
	`years_running` integer,
	`is_claimed` integer DEFAULT false NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`featured_until` integer,
	`coupon_code` text,
	`coupon_discount` text,
	`coupon_expires_at` text,
	`photo_urls` text DEFAULT '[]' NOT NULL,
	`faq` text,
	`source_url` text,
	`last_verified_at` integer,
	`beginner_score` integer,
	`pr_score` integer,
	`value_score` integer,
	`vibe_score` integer,
	`family_score` integer,
	`urgency_score` integer,
	`score_breakdown` text,
	`scores_updated_at` integer,
	FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`state_id`) REFERENCES `states`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organizer_id`) REFERENCES `organizers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`series_id`) REFERENCES `race_series`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `races_slug_unique` ON `races` (`slug`);--> statement-breakpoint
CREATE INDEX `races_state_idx` ON `races` (`state`);--> statement-breakpoint
CREATE INDEX `races_date_idx` ON `races` (`date`);--> statement-breakpoint
CREATE INDEX `races_organizer_idx` ON `races` (`organizer_id`);--> statement-breakpoint
CREATE INDEX `races_turkey_trot_idx` ON `races` (`is_turkey_trot`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`item_type` text NOT NULL,
	`item_id` integer NOT NULL,
	`rating` integer NOT NULL,
	`comment` text,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	`updated_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_user_item_idx` ON `reviews` (`user_id`,`item_type`,`item_id`);--> statement-breakpoint
CREATE INDEX `reviews_item_idx` ON `reviews` (`item_type`,`item_id`);--> statement-breakpoint
CREATE INDEX `reviews_user_idx` ON `reviews` (`user_id`);--> statement-breakpoint
CREATE TABLE `routes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`distance` real NOT NULL,
	`elevation_gain` integer DEFAULT 0 NOT NULL,
	`surface` text NOT NULL,
	`type` text NOT NULL,
	`difficulty` text NOT NULL,
	`description` text,
	`city_id` integer,
	`state_id` integer,
	`distance_meters` real,
	`lat` real,
	`lng` real,
	`route_type` text,
	`polyline` text,
	`gpx_url` text,
	`is_active` integer DEFAULT true NOT NULL,
	`quality_score` integer DEFAULT 50 NOT NULL,
	`first_seen_at` integer DEFAULT (unixepoch() * 1000),
	`last_seen_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`state_id`) REFERENCES `states`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `routes_slug_unique` ON `routes` (`slug`);--> statement-breakpoint
CREATE TABLE `saved_searches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`query_json` text NOT NULL,
	`alert_enabled` integer DEFAULT false NOT NULL,
	`last_notified_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `saved_searches_user_idx` ON `saved_searches` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`sid` text PRIMARY KEY NOT NULL,
	`sess` text NOT NULL,
	`expire` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `IDX_session_expire` ON `session` (`expire`);--> statement-breakpoint
CREATE TABLE `source_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`external_id` text,
	`external_url` text,
	`payload_json` text,
	`fetched_at` integer DEFAULT (unixepoch() * 1000),
	`last_modified_at` integer DEFAULT (unixepoch() * 1000),
	`normalized_name` text,
	`normalized_location_key` text,
	`normalized_date` text,
	`hash_key` text,
	`canonical_race_id` integer,
	`canonical_route_id` integer,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`canonical_race_id`) REFERENCES `races`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`canonical_route_id`) REFERENCES `routes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `source_records_source_idx` ON `source_records` (`source_id`);--> statement-breakpoint
CREATE INDEX `source_records_hash_idx` ON `source_records` (`hash_key`);--> statement-breakpoint
CREATE INDEX `source_records_race_idx` ON `source_records` (`canonical_race_id`);--> statement-breakpoint
CREATE INDEX `source_records_route_idx` ON `source_records` (`canonical_route_id`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'manual' NOT NULL,
	`base_url` text,
	`terms_url` text,
	`priority` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sources_name_unique` ON `sources` (`name`);--> statement-breakpoint
CREATE TABLE `sponsorships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brand` text NOT NULL,
	`headline` text NOT NULL,
	`body` text,
	`image_url` text,
	`cta_label` text DEFAULT 'Learn more' NOT NULL,
	`cta_url` text NOT NULL,
	`placement` text DEFAULT 'search' NOT NULL,
	`city_id` integer,
	`state_id` integer,
	`distance` text,
	`is_turkey_trot` integer,
	`start_date` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`end_date` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`impressions` integer DEFAULT 0 NOT NULL,
	`clicks` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`state_id`) REFERENCES `states`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `sponsorships_placement_idx` ON `sponsorships` (`placement`);--> statement-breakpoint
CREATE INDEX `sponsorships_status_idx` ON `sponsorships` (`status`);--> statement-breakpoint
CREATE INDEX `sponsorships_city_idx` ON `sponsorships` (`city_id`);--> statement-breakpoint
CREATE TABLE `states` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`abbreviation` text NOT NULL,
	`fips` text,
	`race_count` integer DEFAULT 0 NOT NULL,
	`route_count` integer DEFAULT 0 NOT NULL,
	`popular_cities` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `states_slug_unique` ON `states` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `states_abbreviation_unique` ON `states` (`abbreviation`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`unsubscribed_alert_types` text DEFAULT '[]' NOT NULL,
	`unsubscribed_all` integer DEFAULT false NOT NULL,
	`is_organizer` integer DEFAULT false NOT NULL,
	`organizer_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	`last_login_at` integer,
	FOREIGN KEY (`organizer_id`) REFERENCES `organizers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_organizer_idx` ON `users` (`organizer_id`);