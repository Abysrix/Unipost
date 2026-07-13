-- ─────────────────────────────────────────────────────────────
-- UniPost · Post-RC1 correctness pass · Revoke stale rate-limit grant
--
-- 0018_rate_limiting.sql granted EXECUTE on private.check_rate_limit to
-- authenticated/anon. 0019_rate_limiting_rpc.sql then added the real access
-- path — a public.check_rate_limit wrapper restricted to service_role only —
-- but never revoked the earlier grant on the private-schema function it
-- wraps. In practice this has been inert: PostgREST's .rpc() can only reach
-- public-schema functions, and this project's `private` schema is
-- consistently treated as non-exposed throughout every migration that uses
-- it. Revoked anyway for defense-in-depth consistency with 0019's own stated
-- intent ("only service_role can call this").
-- ─────────────────────────────────────────────────────────────

revoke execute on function private.check_rate_limit(text, integer, integer) from authenticated, anon;
