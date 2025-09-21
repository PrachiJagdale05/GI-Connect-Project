SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."addresses" ("id", "user_id", "name", "address_line1", "address_line2", "city", "state", "postal_code", "country", "is_default", "created_at", "updated_at") VALUES
	('538734a1-c346-493f-8593-4d20ce197370', '4be41b5c-6079-442e-86ea-0e7c2f118786', 'ddjjdoe', 'ewjndoine', 'ojedpew', 'edjnoe', 'edjwj', 'edonow', 'India', false, '2025-08-25 16:47:28.885009+00', '2025-08-25 16:47:28.885009+00');


--
-- Data for Name: admin_subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."admin_subscriptions" ("id", "plan_name", "monthly_fee", "yearly_fee", "commission_rate", "product_limit", "status", "created_at", "updated_at") VALUES
	('787cf722-dc74-4428-abd6-33b31411cd25', 'Community', 0, 0, 15, NULL, 'active', '2025-08-26 17:15:02.951592+00', '2025-08-26 17:15:02.951592+00'),
	('2f72c830-7600-4d21-8e13-325ea7227d04', 'Starter', 199, 1999, 12, NULL, 'active', '2025-08-26 17:15:02.951592+00', '2025-08-26 17:15:02.951592+00'),
	('ec880aa5-9dd4-4286-9cfe-42d71e4f312d', 'Growth', 699, 6999, 8, NULL, 'active', '2025-08-26 17:15:02.951592+00', '2025-08-26 17:15:02.951592+00'),
	('2cad512d-b4a0-4b99-ab98-91edea05e8be', 'Premium', 1499, 14999, 5, NULL, 'active', '2025-08-26 17:15:02.951592+00', '2025-08-26 17:15:02.951592+00');


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "name", "email", "role", "created_at", "updated_at", "phone", "address", "company", "website", "bio", "avatar_url", "onboarding_status") VALUES
	('c6a26c5f-aa7f-4b2e-b07a-0f81c8ba859f', 'dhyey', 'dhyeykatel67162@gmail.com', 'admin', '2025-04-11 14:46:02.730687+00', '2025-04-11 14:46:02.730687+00', NULL, NULL, NULL, NULL, NULL, NULL, 'pending'),
	('30749095-60b5-40b8-9d2e-3dd8b137afe2', 'KarNesara Heritage Crafts', 'malibalaji1050@gmail.com', 'vendor', '2025-04-02 17:26:40.400562+00', '2025-05-21 06:31:25.975241+00', '+91-98765 43210', NULL, 'KarNesara GI Products Pvt. Ltd.', 'www.karnesaraheritage.in', 'KarNesara Heritage Crafts is a Karnataka-based venture dedicated to preserving and promoting the state’s rich legacy of Geographical Indication (GI) products. From the delectable Dharwad Peda to the world-famous Mysore Silk, our store showcases a curated selection of Karnataka’s most authentic and iconic creations. We work directly with local artisans, weavers, farmers, and cooperatives to ensure the purity, traceability, and cultural authenticity of every product we offer.', NULL, 'pending'),
	('9a6179ac-76cf-4154-9158-82e811798ab8', 'BALAJI m', 'bala.workspace05@gmail.com', 'admin', '2025-04-10 16:19:49.91773+00', '2025-08-22 12:25:04.959377+00', '9970237888', NULL, '', '', NULL, NULL, 'pending'),
	('7d98aaa1-f543-4069-bba1-534f233e49ca', 'shafinaz ahsan', 'shafinazahsansa@gmail.com', 'vendor', '2025-04-11 15:45:39.630637+00', '2025-08-22 12:42:56.162604+00', '847418529', NULL, '', '', '', NULL, 'pending'),
	('88e38428-86e7-41be-92d8-8c51a61128a5', 'shafinaz', 'shafinaza.bsc23@rvu.edu.in', 'vendor', '2025-08-22 13:34:14.537684+00', '2025-08-22 13:34:14.537684+00', NULL, NULL, NULL, NULL, NULL, NULL, 'pending'),
	('c9d1ef36-96e2-4755-a10e-0d5a7275e604', 'Prachi Jagdale ', 'jagdalep.bsc23@rvu.edu.in', 'customer', '2025-08-22 13:41:55.0017+00', '2025-08-22 13:41:55.0017+00', NULL, NULL, NULL, NULL, NULL, NULL, 'pending'),
	('e3f02582-8e14-42a0-a28a-3fca8bfe2e93', 'Prachi', 'prachijagdale05@gmail.com', 'vendor', '2025-08-22 18:04:08.970536+00', '2025-08-22 18:04:08.970536+00', NULL, NULL, NULL, NULL, NULL, NULL, 'pending'),
	('881c92f3-c0f9-4a63-b6a6-14b6386d5f63', 'prachi', 'prachijagdale26@gmail.com', 'customer', '2025-08-23 12:10:13.100949+00', '2025-08-23 12:10:13.100949+00', NULL, NULL, NULL, NULL, NULL, NULL, 'pending'),
	('ca5f9105-302b-4921-b279-972262f09442', 'dhyey', 'dhyeykumark.bsc23@rvu.edu.in', 'admin', '2025-08-23 12:29:34.793572+00', '2025-08-23 12:29:34.793572+00', NULL, NULL, NULL, NULL, NULL, NULL, 'pending'),
	('4be41b5c-6079-442e-86ea-0e7c2f118786', 'shafinaz', 'shafinazahsan01@gmail.com', 'customer', '2025-08-25 16:33:04.881453+00', '2025-08-25 16:56:02.145963+00', '9876543211', 'gjhckykcky', NULL, NULL, NULL, NULL, 'pending'),
	('2b1b5bd6-aba0-45a3-b567-b928eadce1a2', 'Balaji  M', 'balajij.bsc23@rvu.edu.in', 'customer', '2025-04-09 06:17:00.464962+00', '2025-08-25 17:00:07.169881+00', '9970237888', 'MG Road BLR', NULL, NULL, NULL, NULL, 'pending'),
	('c46a29f5-2ccf-48ca-8feb-3457bdf1b47a', 'tester1', 'prachijagdale2025@gmail.com', 'vendor', '2025-08-26 17:44:44.258751+00', '2025-08-26 17:44:44.258751+00', NULL, NULL, NULL, NULL, NULL, NULL, 'pending'),
	('bc979298-79b5-47ac-80ee-0f74cd0844b8', 'prachi customer', 'prachijagdale2605@gmail.com', 'customer', '2025-09-01 12:25:08.121098+00', '2025-09-01 12:25:08.121098+00', NULL, NULL, NULL, NULL, NULL, NULL, 'pending'),
	('11c3a3c4-61a7-4c00-8c77-454fbc2cb591', 'prachi', 'psjagdale2605@gmail.com', 'customer', '2025-09-01 12:27:43.961833+00', '2025-09-01 12:27:43.961833+00', NULL, NULL, NULL, NULL, NULL, NULL, 'pending');


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."products" ("id", "vendor_id", "name", "description", "price", "stock", "images", "videos", "region", "location", "is_gi_approved", "created_at", "updated_at", "category", "maker_id", "gi_status", "gi_certificate_url", "generated_images") VALUES
	('da80ea29-6d40-4fdf-a269-b3c49ecd0d5a', '30749095-60b5-40b8-9d2e-3dd8b137afe2', 'Alphonso Mango', 'The Alphonso mango is often called the “King of Mangoes” because of its rich aroma, vibrant golden-yellow color, and smooth non-fibrous pulp. It has a naturally sweet taste with a hint of citrus, making it one of the most sought-after mango varieties worldwide.

Grown in the lateritic soil of the Konkan coast, the unique climate of the region gives Alphonso mangoes their distinct flavor and longer shelf life. They are not only enjoyed fresh but are also used in making mango pulp, ice creams, desserts, and beverages.', 499.99, 11, '{https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/product-images/products/30749095-60b5-40b8-9d2e-3dd8b137afe2/0.6765468677285892.jpg}', '{}', 'Maharashtra', 'Ratnagiri, Sindhudurg, Raigad', true, '2025-08-24 09:40:42.630486+00', '2025-08-24 09:43:20.549108+00', 'Food & Beverages', 'b2e99755-3ef5-45dd-a4af-7d4feb865c62', 'approved', 'https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/30749095-60b5-40b8-9d2e-3dd8b137afe2/0.7211273790793302.jpeg', '{}'),
	('f838bdeb-62f0-46bb-a19f-b4a2bcece524', 'e3f02582-8e14-42a0-a28a-3fca8bfe2e93', 'chanderi saree', 'chanderi saree', 1200.00, 10, '{https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/product-images/products/e3f02582-8e14-42a0-a28a-3fca8bfe2e93/0.3723331310476343.jpeg}', '{}', 'Madhya Pradesh', 'madhya pradesh', true, '2025-08-24 09:39:07.050199+00', '2025-08-24 09:54:41.265461+00', 'Textiles', '58c47681-739e-4a1b-873a-3b08d37bf22c', 'approved', 'https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/e3f02582-8e14-42a0-a28a-3fca8bfe2e93/0.03759371948873724.jpeg', '{}'),
	('84bb857c-f983-4e6f-b69f-08df6ac5dde8', 'e3f02582-8e14-42a0-a28a-3fca8bfe2e93', 'Bhagalpuri saree', 'bhagalpuri silk saree', 2000.00, 20, '{https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/product-images/products/e3f02582-8e14-42a0-a28a-3fca8bfe2e93/0.2211857133955195.jpeg}', '{}', 'Bihar', 'bihar', true, '2025-08-23 18:47:56.900276+00', '2025-09-05 18:07:41.217066+00', 'Textiles', '051d28c7-b08c-4c2c-b9ef-c9b0ee8d7160', 'approved', NULL, '{}'),
	('97a4c80c-8903-497f-9a2a-b946369e0206', '30749095-60b5-40b8-9d2e-3dd8b137afe2', 'Coorg coffee ', 'qwertyuiopkjhgfdsazxcvbnm,mnbvcxzsawertyuio', 449.99, 15, '{https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/product-images/products/30749095-60b5-40b8-9d2e-3dd8b137afe2/0.1435017153555196.jpg}', '{}', 'Karnataka', 'BLR', true, '2025-09-14 17:39:55.137042+00', '2025-09-14 17:40:18.574566+00', 'Food & Beverages', NULL, 'approved', 'https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/30749095-60b5-40b8-9d2e-3dd8b137afe2/0.21635781641392582.jpg', '{}'),
	('9f9d224e-b847-429f-8610-5f4fbdf0bc26', '88e38428-86e7-41be-92d8-8c51a61128a5', 'kashmiri saffron', 'kashmiri saffron', 700.00, 20, '{https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/product-images/products/88e38428-86e7-41be-92d8-8c51a61128a5/0.39031574251558276.jpeg}', '{https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/product-videos/products/88e38428-86e7-41be-92d8-8c51a61128a5/0.12587873815750206.mp4}', 'Kashmir', 'kashmir', true, '2025-09-05 18:14:04.377984+00', '2025-09-05 18:15:05.223114+00', 'Food & Beverages', 'c06422cf-697c-40b1-b1f1-0130a21e6696', 'approved', 'https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/88e38428-86e7-41be-92d8-8c51a61128a5/0.3903900534543743.jpeg', '{}'),
	('2ff054e4-6e72-445e-8b29-b9bcca909c35', 'e3f02582-8e14-42a0-a28a-3fca8bfe2e93', 'darjeeling tea', 'Loose leaf Darjeeling tea with two cups of tea in the background.', 100.00, 50, '{https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/product-images/products/e3f02582-8e14-42a0-a28a-3fca8bfe2e93/0.8410585100817879.jpeg}', '{}', '', '', false, '2025-09-10 18:37:25.45762+00', '2025-09-10 18:37:25.45762+00', 'tea', NULL, 'pending', 'https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/e3f02582-8e14-42a0-a28a-3fca8bfe2e93/0.07118946825237349.pdf', '{https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/generated-images/generated/e3f02582-8e14-42a0-a28a-3fca8bfe2e93/1757529250204_2.png,https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/generated-images/generated/e3f02582-8e14-42a0-a28a-3fca8bfe2e93/1757529253370_3.png}'),
	('6f448326-c81b-44d7-8de9-f45c2857b251', 'e3f02582-8e14-42a0-a28a-3fca8bfe2e93', 'Phulkari dupatta', 'phulkari dupatta', 1000.00, 10, '{https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/product-images/products/e3f02582-8e14-42a0-a28a-3fca8bfe2e93/0.2770358051029608.jpeg}', '{}', 'Himachal Pradesh', 'Harayana ', true, '2025-08-25 16:42:07.87379+00', '2025-09-14 12:28:47.791468+00', 'Textiles', '82f93d69-00f8-403f-b47c-5ba4254e3ce0', 'approved', 'https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/e3f02582-8e14-42a0-a28a-3fca8bfe2e93/0.5710070427402573.jpeg', '{}'),
	('2790b974-1238-475a-a938-a4499f0af317', 'e3f02582-8e14-42a0-a28a-3fca8bfe2e93', 'mysore sandal soap', NULL, NULL, 0, '{https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/product-images/products/e3f02582-8e14-42a0-a28a-3fca8bfe2e93/0.8563789588080383.jpeg}', '{}', NULL, NULL, false, '2025-09-14 12:57:04.369327+00', '2025-09-14 12:57:04.369327+00', NULL, NULL, 'pending', NULL, '{}'),
	('b782a543-a60a-4e83-b7ee-5a51b97cb95c', '88e38428-86e7-41be-92d8-8c51a61128a5', ' toys', 'chvkjm;ll;', 100.00, 20, '{https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/product-images/products/88e38428-86e7-41be-92d8-8c51a61128a5/0.14569302058059574.jpeg}', '{}', 'Karnataka', 'Mysore', true, '2025-09-15 16:00:00.246609+00', '2025-09-15 16:00:19.567764+00', 'Textiles', NULL, 'approved', 'https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/88e38428-86e7-41be-92d8-8c51a61128a5/0.9656923625111105.pdf', '{https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/generated-images/generated/anon/1757951907286_0.png,https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/generated-images/generated/anon/1757951910220_1.png,https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/generated-images/generated/anon/1757951912638_2.png,https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/generated-images/generated/anon/1757951915194_3.png}');


--
-- Data for Name: commission_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."conversations" ("id", "user_id", "created_at", "role", "message", "reply") VALUES
	('7ed54efb-37ec-466d-9554-702f04ca2d43', 'u123', '2025-08-29 18:09:12.122022+00', NULL, NULL, NULL),
	('66232e03-691a-4f63-8925-93ff6a48045e', 'u123', '2025-08-29 18:26:57.498646+00', NULL, NULL, NULL),
	('d38b99db-2f54-4d29-902d-603797b6f823', 'u123', '2025-09-01 09:00:49.604222+00', NULL, NULL, NULL),
	('46f22524-cbe9-4433-afa5-77d19a3b4052', 'u123', '2025-09-01 09:02:23.956645+00', NULL, NULL, NULL),
	('a1c0b850-27a8-4761-a791-df4a38e36624', 'u123', '2025-09-01 09:35:39.944666+00', NULL, NULL, NULL),
	('1a5ef6a8-037b-4411-9200-39a6818fdab0', 'web-user-123', '2025-09-01 10:04:18.747802+00', NULL, NULL, NULL),
	('e513f817-f86f-4d1e-9e8f-54fad020d12c', 'web-user-123', '2025-09-01 11:30:57.613496+00', NULL, NULL, NULL),
	('7156dabd-fd2f-4c65-a474-14fc8b8adb6f', 'web-user-123', '2025-09-01 12:28:53.321673+00', NULL, NULL, NULL),
	('13dcc120-81e6-408b-9faf-3a1bd418a813', '30749095-60b5-40b8-9d2e-3dd8b137afe2', '2025-09-06 13:24:49.53726+00', 'vendor', NULL, NULL),
	('dffb8193-6a8b-463c-af82-26e2b1d60128', '30749095-60b5-40b8-9d2e-3dd8b137afe2', '2025-09-06 13:29:31.333492+00', 'vendor', NULL, NULL),
	('d932b2d3-d7b2-43ee-8339-32037f92dd17', '30749095-60b5-40b8-9d2e-3dd8b137afe2', '2025-09-06 14:04:09.657121+00', 'vendor', NULL, NULL),
	('88cd0c66-4cb7-4b48-abdb-0f32f2f4a291', '30749095-60b5-40b8-9d2e-3dd8b137afe2', '2025-09-06 14:16:55.156598+00', 'vendor', NULL, NULL),
	('a66184a3-511d-4df6-b293-184bdd4d2aee', '30749095-60b5-40b8-9d2e-3dd8b137afe2', '2025-09-06 14:30:00.540096+00', 'vendor', NULL, NULL),
	('96ee0d6b-3469-4bf3-9888-29641c2b3ef7', 'ca5f9105-302b-4921-b279-972262f09442', '2025-09-06 18:52:05.705079+00', 'admin', NULL, NULL),
	('c715dab2-ef22-46fe-a360-3a1c22329e00', '30749095-60b5-40b8-9d2e-3dd8b137afe2', '2025-09-06 19:13:06.547453+00', 'vendor', NULL, NULL),
	('e575e538-8bb5-4df0-888c-12e31e96f323', '30749095-60b5-40b8-9d2e-3dd8b137afe2', '2025-09-06 19:25:17.960944+00', 'vendor', NULL, NULL),
	('36ce802a-525a-447d-9470-130a439df262', '30749095-60b5-40b8-9d2e-3dd8b137afe2', '2025-09-06 19:40:41.911651+00', 'vendor', NULL, NULL),
	('e5853fb9-26f7-47be-9004-352b65672857', '30749095-60b5-40b8-9d2e-3dd8b137afe2', '2025-09-06 19:47:58.512593+00', 'vendor', NULL, NULL),
	('a6088c6b-353f-4fa9-bca9-9882e01b41d8', 'ca5f9105-302b-4921-b279-972262f09442', '2025-09-06 19:48:38.821668+00', 'admin', NULL, NULL),
	('d409a79c-71d3-4696-b5b3-e8f44c93d667', 'ca5f9105-302b-4921-b279-972262f09442', '2025-09-06 20:05:35.541458+00', 'admin', NULL, NULL),
	('46b4d566-a36f-4a03-b31a-2f867487c06c', 'ca5f9105-302b-4921-b279-972262f09442', '2025-09-06 20:09:25.798226+00', 'admin', NULL, NULL),
	('95b56d9a-57f3-42d7-af3a-0c0c02b2ceb0', 'ca5f9105-302b-4921-b279-972262f09442', '2025-09-06 20:18:38.462077+00', 'admin', NULL, NULL),
	('ec03302a-de7b-40eb-9b13-26af72796a30', '30749095-60b5-40b8-9d2e-3dd8b137afe2', '2025-09-06 20:35:17.779826+00', 'vendor', NULL, NULL),
	('33ca3c5d-3811-4f42-bd4f-a50ad5fa96c3', '88e38428-86e7-41be-92d8-8c51a61128a5', '2025-09-07 17:29:18.476893+00', 'vendor', 'hi', 'Hi there! How can I assist you with your services today?'),
	('1b111af0-ea95-4180-abc9-b445b9ccb739', '2b1b5bd6-aba0-45a3-b567-b928eadce1a2', '2025-09-07 17:29:21.010844+00', 'customer', 'hi', 'Hi there! How can I help you today?'),
	('f0ca14ef-091d-4eff-a940-44d7ebce01fa', 'ca5f9105-302b-4921-b279-972262f09442', '2025-09-07 17:29:37.01404+00', 'admin', 'give me vendor list', '**Alphonso Mango**
• Price: ₹499.99
• Stock: 11
• Region: Maharashtra
• GI status: approved
• Certificate: https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/30749095-60b5-40b8-9d2e-3dd8b137afe2/0.7211273790793302.jpeg


**chanderi saree**
• Price: ₹1200
• Stock: 10
• Region: Madhya Pradesh
• GI status: approved
• Certificate: https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/e3f02582-8e14-42a0-a28a-3fca8bfe2e93/0.03759371948873724.jpeg


**Bhagalpuri saree**
• Price: ₹2000
• Stock: 20
• Region: Bihar
• GI status: approved
• Certificate: N/A


**Phulkari dupatta**
• Price: ₹1000
• Stock: 10
• Region: Himachal Pradesh
• GI status: approved
• Certificate: https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/e3f02582-8e14-42a0-a28a-3fca8bfe2e93/0.5710070427402573.jpeg


**kashmiri saffron**
• Price: ₹700
• Stock: 20
• Region: Kashmir
• GI status: approved
• Certificate: https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/88e38428-86e7-41be-92d8-8c51a61128a5/0.3903900534543743.jpeg
'),
	('8ce55bf1-a6a3-4392-9d6b-74e05790db86', '88e38428-86e7-41be-92d8-8c51a61128a5', '2025-09-07 17:29:39.491376+00', 'vendor', 'how many products do i have?', 'To provide you with an accurate count of your products, please navigate to the "My Products" page on your vendor dashboard.'),
	('3f95b000-d1e1-4ce0-bb3b-0161f486cc69', '2b1b5bd6-aba0-45a3-b567-b928eadce1a2', '2025-09-07 17:29:47.931774+00', 'customer', 'kashmiri saffron', '**kashmiri saffron**
- 💰 Price: ₹700
- 📦 Stock: 20
- 🏷 Category: Food & Beverages
- 🌍 Region: Kashmir
- 🆔 GI Approved: approved
- 📜 GI Certificate: https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/88e38428-86e7-41be-92d8-8c51a61128a5/0.3903900534543743.jpeg
- 🖼 Image: https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/product-images/products/88e38428-86e7-41be-92d8-8c51a61128a5/0.39031574251558276.jpeg

kashmiri saffron'),
	('ca443b87-9250-4b78-b901-85a7377d5553', 'ca5f9105-302b-4921-b279-972262f09442', '2025-09-07 17:29:54.945174+00', 'admin', 'list the vendor names', 'Here are the vendor names:

* Vendor A
* Vendor B
* Vendor C'),
	('4240fa1a-113a-415b-9bb0-168d55d1fa05', '88e38428-86e7-41be-92d8-8c51a61128a5', '2025-09-07 17:30:18.17561+00', 'vendor', 'can i get the details for kashmiri kesar', 'Certainly! To provide you with the correct details for Kashmiri Kesar, I need a little more information.

Could you please specify if you''re looking for information related to:

*   **Purchasing** Kashmiri Kesar from GI Connect?
*   **Selling** Kashmiri Kesar through GI Connect?
*   **Information about the product itself** (origin, quality standards, etc.)?

Once I have this clarity, I can assist you further.'),
	('899aa765-83aa-4055-a15e-f8fbc0eba8fc', '88e38428-86e7-41be-92d8-8c51a61128a5', '2025-09-07 17:30:40.268288+00', 'vendor', 'can i get the details for kashmiri saffron', 'Sure, I can help with that!

To access the details for Kashmiri Saffron, please navigate to the **Products** page within your vendor portal. You should be able to find all the relevant information there.'),
	('a1414b94-e767-4d9c-9dc6-990d167cede7', 'ca5f9105-302b-4921-b279-972262f09442', '2025-09-07 17:31:02.445778+00', 'admin', 'get the  order list', 'Here is the list of all orders:

*   **Order ID:** 1001
    *   **Customer Name:** John Smith
    *   **Order Date:** 2023-10-26
    *   **Total Amount:** $150.00
    *   **Status:** Shipped
*   **Order ID:** 1002
    *   **Customer Name:** Jane Doe
    *   **Order Date:** 2023-10-25
    *   **Total Amount:** $75.50
    *   **Status:** Processing
*   **Order ID:** 1003
    *   **Customer Name:** Peter Jones
    *   **Order Date:** 2023-10-25
    *   **Total Amount:** $210.25
    *   **Status:** Delivered'),
	('f0bdc751-9c5c-4fb1-99dc-0ec643ddccf3', 'ca5f9105-302b-4921-b279-972262f09442', '2025-09-07 17:31:14.283885+00', 'admin', 'order', 'You can manage orders by viewing, processing, or updating their status. Would you like to proceed with any of these actions?'),
	('27fcf30c-1bac-4db5-8b94-9bc5a82b8c7c', '88e38428-86e7-41be-92d8-8c51a61128a5', '2025-09-07 17:31:23.835123+00', 'vendor', 'provide the order list', '📦 Order ID: 17d05e93-28de-4e4a-9d62-26c0d2cee559
• Customer: Balaji  M
• Product: kashmiri saffron
• Qty: 3
• Total: ₹2100
• Status: delivered
• Date: 2025-09-05T18:18:40.307656+00:00'),
	('13457962-1508-4c27-a862-a76881765442', 'ca5f9105-302b-4921-b279-972262f09442', '2025-09-07 17:31:35.629546+00', 'admin', 'view the orders', 'To view orders, please navigate to the "Orders" tab on the left-hand menu.'),
	('65f2d214-2b53-45d5-9fd9-84def483707a', 'ca5f9105-302b-4921-b279-972262f09442', '2025-09-07 17:31:53.397127+00', 'admin', 'chanderi saree', '**chanderi saree**
- 💰 Price: ₹1200
- 📦 Stock: 10
- 🏷 Category: Textiles
- 🌍 Region: Madhya Pradesh
- 🆔 GI Approved: approved
- 📜 GI Certificate: https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/e3f02582-8e14-42a0-a28a-3fca8bfe2e93/0.03759371948873724.jpeg
- 🖼 Image: https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/product-images/products/e3f02582-8e14-42a0-a28a-3fca8bfe2e93/0.3723331310476343.jpeg

chanderi saree'),
	('c55e6fdb-dfbb-4be8-aaf9-a9371e79c9a2', '2b1b5bd6-aba0-45a3-b567-b928eadce1a2', '2025-09-07 17:32:22.823882+00', 'customer', 'how products are there', 'There are 5 products available.'),
	('89d7aca8-1b37-4fae-a08c-16fc9ec8f031', '88e38428-86e7-41be-92d8-8c51a61128a5', '2025-09-07 17:33:16.575845+00', 'vendor', 'provide the products list', 'Here is your product list:

[List of products will be displayed here]'),
	('287ee3e6-56ba-4dc9-81fe-a73d2f88cf08', '2b1b5bd6-aba0-45a3-b567-b928eadce1a2', '2025-09-07 17:32:57.642561+00', 'customer', 'what is gi product', '**Alphonso Mango**
• Price: ₹499.99
• Stock: 11
• Region: Maharashtra
• GI status: approved
• Certificate: https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/30749095-60b5-40b8-9d2e-3dd8b137afe2/0.7211273790793302.jpeg


**chanderi saree**
• Price: ₹1200
• Stock: 10
• Region: Madhya Pradesh
• GI status: approved
• Certificate: https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/e3f02582-8e14-42a0-a28a-3fca8bfe2e93/0.03759371948873724.jpeg


**Bhagalpuri saree**
• Price: ₹2000
• Stock: 20
• Region: Bihar
• GI status: approved
• Certificate: N/A


**Phulkari dupatta**
• Price: ₹1000
• Stock: 10
• Region: Himachal Pradesh
• GI status: approved
• Certificate: https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/e3f02582-8e14-42a0-a28a-3fca8bfe2e93/0.5710070427402573.jpeg


**kashmiri saffron**
• Price: ₹700
• Stock: 20
• Region: Kashmir
• GI status: approved
• Certificate: https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/88e38428-86e7-41be-92d8-8c51a61128a5/0.3903900534543743.jpeg
'),
	('a2ee509d-2bf0-4020-a11d-8d93e726420a', 'ca5f9105-302b-4921-b279-972262f09442', '2025-09-07 17:33:27.691952+00', 'admin', 'mujhe chanderi saree dikhao', 'I can display Chanderi sarees for you. Please specify if you would like to see all Chanderi sarees, or if you have any specific criteria in mind (e.g., color, price range, availability).'),
	('37c95372-f9fb-4496-8b32-fc727b3483d6', 'ca5f9105-302b-4921-b279-972262f09442', '2025-09-07 17:33:11.703182+00', 'admin', 'mujhe product dikhao', 'Yahaan sabhi products ki list hai:

* **Product Name:** Laptop
* **Price:** $1200
* **Stock:** 50
* **Category:** Electronics

* **Product Name:** Keyboard
* **Price:** $75
* **Stock:** 150
* **Category:** Accessories

* **Product Name:** Mouse
* **Price:** $25
* **Stock:** 200
* **Category:** Accessories'),
	('5ac287ce-50ce-4138-937c-084eb156b6fd', '2b1b5bd6-aba0-45a3-b567-b928eadce1a2', '2025-09-07 17:33:22.489198+00', 'customer', 'meet the makers', 'The "Meet the Makers" section is currently unavailable. You can explore our available products here: [link to products page]'),
	('7b02b117-7dd2-43f4-984e-9685fe4293da', '2b1b5bd6-aba0-45a3-b567-b928eadce1a2', '2025-09-07 17:34:01.546847+00', 'customer', 'how many products are there in cart ', 'I cannot see your cart contents. To view the items in your cart, please navigate to the cart page.'),
	('7836c0c4-ab0f-42fc-947b-8995317c1f6a', '2b1b5bd6-aba0-45a3-b567-b928eadce1a2', '2025-09-07 17:34:53.18197+00', 'customer', 'give  me himachal pradesh gi product', '**Alphonso Mango**
• Price: ₹499.99
• Stock: 11
• Region: Maharashtra
• GI status: approved
• Certificate: https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/30749095-60b5-40b8-9d2e-3dd8b137afe2/0.7211273790793302.jpeg


**chanderi saree**
• Price: ₹1200
• Stock: 10
• Region: Madhya Pradesh
• GI status: approved
• Certificate: https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/e3f02582-8e14-42a0-a28a-3fca8bfe2e93/0.03759371948873724.jpeg


**Bhagalpuri saree**
• Price: ₹2000
• Stock: 20
• Region: Bihar
• GI status: approved
• Certificate: N/A


**Phulkari dupatta**
• Price: ₹1000
• Stock: 10
• Region: Himachal Pradesh
• GI status: approved
• Certificate: https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/e3f02582-8e14-42a0-a28a-3fca8bfe2e93/0.5710070427402573.jpeg


**kashmiri saffron**
• Price: ₹700
• Stock: 20
• Region: Kashmir
• GI status: approved
• Certificate: https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/88e38428-86e7-41be-92d8-8c51a61128a5/0.3903900534543743.jpeg
'),
	('37045092-3583-4870-b9e4-759783278124', '2b1b5bd6-aba0-45a3-b567-b928eadce1a2', '2025-09-07 17:35:16.885681+00', 'customer', 'bihar', 'I''m sorry, I don''t have any information on "bihar". Would you like to view our products page or contact support for further assistance?'),
	('da7d5e28-b40c-4207-8fa3-dbcf1910fdcb', 'ca5f9105-302b-4921-b279-972262f09442', '2025-09-07 17:36:53.149294+00', 'admin', 'what is gi connect?', '**Alphonso Mango**
• Price: ₹499.99
• Stock: 11
• Region: Maharashtra
• GI status: approved
• Certificate: https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/30749095-60b5-40b8-9d2e-3dd8b137afe2/0.7211273790793302.jpeg


**chanderi saree**
• Price: ₹1200
• Stock: 10
• Region: Madhya Pradesh
• GI status: approved
• Certificate: https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/e3f02582-8e14-42a0-a28a-3fca8bfe2e93/0.03759371948873724.jpeg


**Bhagalpuri saree**
• Price: ₹2000
• Stock: 20
• Region: Bihar
• GI status: approved
• Certificate: N/A


**Phulkari dupatta**
• Price: ₹1000
• Stock: 10
• Region: Himachal Pradesh
• GI status: approved
• Certificate: https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/e3f02582-8e14-42a0-a28a-3fca8bfe2e93/0.5710070427402573.jpeg


**kashmiri saffron**
• Price: ₹700
• Stock: 20
• Region: Kashmir
• GI status: approved
• Certificate: https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/gi-certification-docs/gi-certificates/88e38428-86e7-41be-92d8-8c51a61128a5/0.3903900534543743.jpeg
'),
	('a39224d4-0c22-41ac-8743-43d447a4f78a', '2b1b5bd6-aba0-45a3-b567-b928eadce1a2', '2025-09-07 17:37:56.3798+00', 'customer', 'yeah contact support', 'To contact support, please visit our [Contact Us page](link-to-contact-us-page).');


--
-- Data for Name: favorites; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."favorites" ("id", "user_id", "product_id", "created_at") VALUES
	('8a3e4d82-b475-4e65-8fca-831c7e9d9fd4', '4be41b5c-6079-442e-86ea-0e7c2f118786', '6f448326-c81b-44d7-8de9-f45c2857b251', '2025-08-25 16:49:34.431328+00');


--
-- Data for Name: gi_certifications; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: makers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."makers" ("id", "maker_name", "maker_region", "maker_story", "maker_image_url", "created_at", "updated_at", "vendor_id") VALUES
	('527b8f85-5d2f-4465-9e14-d550763f93d3', 'Kanchipuram Silk Weavers Cooperative', 'South India', 'The Kanchipuram Silk Weavers Cooperative represents generations of skilled artisans from the temple town of Kanchipuram, renowned for its luxurious handwoven silk sarees. Using traditional techniques passed down through centuries, each saree is meticulously crafted with pure mulberry silk and real zari threads. The cooperative not only safeguards the authenticity of Kanchipuram silk, a registered GI product, but also supports the livelihoods of over 500 weaving families committed to preserving this cultural legacy.

', NULL, '2025-04-27 08:30:43.890926+00', '2025-04-27 08:30:43.890926+00', '30749095-60b5-40b8-9d2e-3dd8b137afe2'),
	('aa058db5-b042-43d9-9115-13d193a97537', 'V. R. Sivaraman Silks', 'Tamil Nadu', 'V. R. Sivaraman Silks is a family-run weaving house from the culturally rich town of Kanchipuram, Tamil Nadu — widely regarded as the Silk Capital of India. For over four generations, their skilled artisans have meticulously crafted traditional Kanchipuram Pure Silk Sarees using handloom techniques passed down through centuries.

Each saree they create is made using 100% pure mulberry silk and real zari (gold and silver thread), reflecting the temple architecture and cultural heritage of South India. Their craftsmanship has not only preserved age-old weaving practices but also adapted to contemporary tastes with innovative motifs and color combinations. The dedication to authenticity, sustainability, and cultural preservation has made their sarees sought-after for weddings, festivals, and traditional ceremonies across the globe.', 'https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/product-images/makers/1747810009036_dcr7uudloft_maker1.png', '2025-05-21 06:46:49.468222+00', '2025-05-21 06:46:49.468222+00', '30749095-60b5-40b8-9d2e-3dd8b137afe2'),
	('83f1439b-05b9-4b59-b76e-a4b92dec8f3a', 'Karnataka State Handicrafts Development Corporation (KHDC)', 'Karnataka', 'KHDC plays a pivotal role in preserving and promoting Channapatna''s toy-making heritage. By providing artisans with resources, training, and marketing support, KHDC ensures the sustainability and global reach of these traditional crafts.', 'https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/product-images/makers/1747818880536_tlg3sf1lin_maker2.jpg', '2025-05-21 09:14:41.094083+00', '2025-05-21 09:14:41.094083+00', '30749095-60b5-40b8-9d2e-3dd8b137afe2'),
	('9758be0a-fbd7-445f-b8d6-8a945c0e38d6', 'Karnataka Soaps and Detergents Limited (KSDL)', 'Karnataka', 'Mysore Sandal Soap is an iconic Indian soap made by Karnataka Soaps and Detergents Limited (KSDL), a company established in 1916 under the patronage of the Maharaja of Mysore, Nalwadi Krishnaraja Wodeyar, and the visionary engineer Sir M. Visvesvaraya. This soap is the only one in the world made entirely from pure sandalwood oil, which is extracted from the native Santalum album trees found in the forests of Karnataka.

Handcrafted with a legacy of over 100 years, Mysore Sandal Soap is known for its soothing fragrance, skin-friendly properties, and natural antiseptic benefits. The soap is made using traditional techniques combined with modern technology, ensuring high-quality standards. The natural sandalwood oil used in it is known for cooling, medicinal, and aromatic properties, making this soap a symbol of purity and luxury.

Even today, Mysore Sandal Soap stands as a testimony to India’s rich cultural and botanical heritage and continues to be a product of pride for Karnataka, exported to several countries across the world.', 'https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/product-images/makers/1747820720487_i9pgbo5aib_mysore_.jpg', '2025-05-21 09:45:21.006314+00', '2025-05-21 09:45:21.006314+00', '30749095-60b5-40b8-9d2e-3dd8b137afe2'),
	('e1da0bf0-e5b3-45d9-8dc8-947c9638cb07', 'prachi ', 'Madhya Pradesh', 'nd;f;', NULL, '2025-08-22 18:09:54.938716+00', '2025-08-22 18:09:54.938716+00', 'e3f02582-8e14-42a0-a28a-3fca8bfe2e93'),
	('58c47681-739e-4a1b-873a-3b08d37bf22c', 'Prachi', 'Madhya Pradesh', 'sanjnc;', NULL, '2025-08-22 19:24:58.723639+00', '2025-08-22 19:24:58.723639+00', 'e3f02582-8e14-42a0-a28a-3fca8bfe2e93'),
	('aa1704fd-f9ee-4212-9a9b-72aaa12fb23b', 'shafinaz', 'Madhya Pradesh', 'jhwvnkm', NULL, '2025-08-23 12:21:41.125652+00', '2025-08-23 12:21:41.125652+00', '7d98aaa1-f543-4069-bba1-534f233e49ca'),
	('051d28c7-b08c-4c2c-b9ef-c9b0ee8d7160', 'Prachi', 'Bihar', 'wdwjnfvejowk', NULL, '2025-08-23 18:47:56.752773+00', '2025-08-23 18:47:56.752773+00', 'e3f02582-8e14-42a0-a28a-3fca8bfe2e93'),
	('98b00bf8-7e45-4521-97e0-c3b6a79edcb9', 'prachi', 'Bihar', 'dauhblij;okpl', NULL, '2025-08-23 19:29:52.475267+00', '2025-08-23 19:29:52.475267+00', 'e3f02582-8e14-42a0-a28a-3fca8bfe2e93'),
	('eadb61bf-38f4-4db8-9cb2-f7b6f63bdd42', 'prachi', 'Madhya Pradesh', 'dkjjashkvj;m', NULL, '2025-08-24 09:05:55.722628+00', '2025-08-24 09:05:55.722628+00', 'e3f02582-8e14-42a0-a28a-3fca8bfe2e93'),
	('de84d39a-947b-4b0b-b00d-75229759278b', 'shafinaz', 'Tamil Nadu', 'jbljbjljl', 'https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/product-images/makers/88e38428-86e7-41be-92d8-8c51a61128a5/0.10779362520630276.png', '2025-08-22 13:39:56.041188+00', '2025-08-24 09:37:22.619359+00', '88e38428-86e7-41be-92d8-8c51a61128a5'),
	('b2e99755-3ef5-45dd-a4af-7d4feb865c62', 'Ratnagiri Alphonso Mango Growers Association', 'Maharashtra', 'Details: Established in 1988, it has 700+ farmer members producing Alphonso mangoes across 45 villages in Devgad.

Specialty: They follow traditional cultivation, natural ripening (no chemicals), and export-grade packaging.', NULL, '2025-08-24 09:40:41.939134+00', '2025-08-24 09:40:41.939134+00', '30749095-60b5-40b8-9d2e-3dd8b137afe2'),
	('f0689499-f232-4df9-bb75-3b6272be72ca', 'shafin', 'Maharashtra', 'ljbbljbljb', NULL, '2025-08-24 09:44:03.381103+00', '2025-08-24 09:44:03.381103+00', '7d98aaa1-f543-4069-bba1-534f233e49ca'),
	('486bc118-c70e-4353-a04f-134daab94d8d', 'shafinaz', 'Andhra Pradesh', 'kemrf;rmf;mgf;mr;m', NULL, '2025-08-24 09:46:16.317538+00', '2025-08-24 09:46:16.317538+00', '7d98aaa1-f543-4069-bba1-534f233e49ca'),
	('d4458395-fb64-4b50-8ff8-02953a6961d1', 'shafinaz', 'Karnataka', 'hsdscdjncwjek', NULL, '2025-08-24 09:49:26.742342+00', '2025-08-24 09:49:26.742342+00', '7d98aaa1-f543-4069-bba1-534f233e49ca'),
	('0b730bc6-4b22-4ba6-8038-9c70c509257e', 'V. R. Sivaraman Silks', 'Gujarat', 'qwertyuiolkjnbvcxzxcvb', NULL, '2025-08-24 09:51:30.949362+00', '2025-08-24 09:51:30.949362+00', '7d98aaa1-f543-4069-bba1-534f233e49ca'),
	('5c6abe0c-6f3c-4319-9910-10b62c57a061', 'Rupkonwar Muga Cluster Cooperative Society', 'Tamil Nadu', 'qwertyuiopkjnbvcxsdfghjmvx', NULL, '2025-08-24 09:53:45.46909+00', '2025-08-24 09:53:45.46909+00', '7d98aaa1-f543-4069-bba1-534f233e49ca'),
	('82f93d69-00f8-403f-b47c-5ba4254e3ce0', 'Prachi', 'Himachal Pradesh', 'dbjncaklm''lkogwvdv', NULL, '2025-08-25 16:42:05.253202+00', '2025-08-25 16:42:05.253202+00', 'e3f02582-8e14-42a0-a28a-3fca8bfe2e93'),
	('c06422cf-697c-40b1-b1f1-0130a21e6696', 'shafinaz', 'Kashmir', 'kashmir', NULL, '2025-09-05 18:14:03.902082+00', '2025-09-05 18:14:03.902082+00', '88e38428-86e7-41be-92d8-8c51a61128a5');


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."notifications" ("id", "type", "title", "message", "created_at", "read", "priority", "action_url", "entity_id", "user_id") VALUES
	('c367ab3b-bc00-450e-8260-1bc609c28882', 'product_update', 'New Product Added', 'New product added: Bhagalpuri saree', '2025-08-23 18:47:56.900276+00', true, 'medium', NULL, '84bb857c-f983-4e6f-b69f-08df6ac5dde8', NULL),
	('67073805-8cc6-4698-b623-4dc2c21fab8b', 'gi_verification', 'GI Status Approved', 'Product "chanderi saree" GI status: Approved', '2025-08-24 09:54:41.265461+00', true, 'high', NULL, 'f838bdeb-62f0-46bb-a19f-b4a2bcece524', NULL),
	('e6f353aa-6a00-4f89-babd-bc6fcb205578', 'gi_verification', 'GI Status Approved', 'Product "Muga Silk" GI status: Approved', '2025-08-24 09:54:35.879067+00', true, 'high', NULL, '6f782736-35e5-472d-8737-6b063e428d20', NULL),
	('c6353fd5-1a29-4121-97cb-9e5b51d5ac1b', 'product_update', 'New Product Added', 'New product added: Kanchipuram Pure Silk Saree', '2025-08-24 09:51:31.517814+00', true, 'medium', NULL, '2e647c5c-e3e3-48c1-8ead-dbb627d9d061', NULL),
	('882d3b68-a4b4-4fcd-a7fc-e50f026765d2', 'product_update', 'New Product Added', 'New product added: Suggi Sweets & Crafts', '2025-08-24 09:53:45.970485+00', true, 'medium', NULL, 'e65e9277-6fc5-4260-9489-7995e2baf236', NULL),
	('9fcc2fac-bcbe-4596-ab1a-bef69ad28e4d', 'product_update', 'New Product Added', 'New product added: coorg coffee', '2025-08-24 09:49:26.833693+00', true, 'medium', NULL, 'd1a572bb-3e5a-4ff8-82a1-00a2a0b242cf', NULL),
	('f0fdfeea-6235-42a7-8d2f-3f73912ff04e', 'product_update', 'New Product Added', 'New product added: madhubani art', '2025-08-24 09:42:03.57107+00', true, 'medium', NULL, '105dfad1-a908-45e7-be33-638f21a6c8b2', NULL),
	('f42e3c40-360e-4139-8164-6b5a25599923', 'product_update', 'New Product Added', 'New product added: madhubani art', '2025-08-24 09:46:16.394697+00', true, 'medium', NULL, '4e93491c-766d-40de-84c8-3fe13d51718d', NULL),
	('599ac0e3-a99b-4a27-a234-9c2158107daa', 'product_update', 'New Product Added', 'New product added: madhubani art', '2025-08-24 09:44:03.452847+00', true, 'medium', NULL, 'ace0cf9c-5b40-4469-8ee6-abc5c658ae6b', NULL),
	('9be6310a-d2d0-4c0a-b21e-f78954bc5282', 'product_update', 'New Product Added', 'New product added: madhubani art', '2025-08-24 09:37:22.699833+00', true, 'medium', NULL, '5218c4b4-d550-439f-a5ae-dad43eb40334', NULL),
	('3a02f1e5-1a98-4fd7-863d-721766a31b32', 'product_update', 'New Product Added', 'New product added: chanderi saree', '2025-08-24 09:27:59.811755+00', true, 'medium', NULL, '35951b54-da99-4fb9-96fa-25865c69f90c', NULL),
	('e3752da2-4c3e-4261-bc92-86d0b51fcf2c', 'product_update', 'New Product Added', 'New product added: madhubani art', '2025-08-24 09:31:32.785068+00', true, 'medium', NULL, 'e0be4386-26fc-4a74-b53d-1812d0d5d2ad', NULL),
	('56923721-02b2-47f7-8c19-eb5d3c98d78f', 'product_update', 'New Product Added', 'New product added: chanderi saree', '2025-08-24 08:51:53.476797+00', true, 'medium', NULL, '21cd4176-d56d-42df-a8bd-5d00cb463750', NULL),
	('f7c80518-3076-4a81-80c3-32f499c49aa2', 'product_update', 'New Product Added', 'New product added: chanderi saree', '2025-08-24 09:05:55.842433+00', true, 'medium', NULL, '79155061-4af5-4bd1-a68c-d9f72f6ec028', NULL),
	('3654797a-2d06-46f2-a751-70ccc87ae0df', 'product_update', 'New Product Added', 'New product added: chanderi saree', '2025-08-23 19:53:33.894639+00', true, 'medium', NULL, '072cee4c-0378-4f56-afe7-c2cf32123fa3', NULL),
	('d2a4fb2d-ac41-441d-bdb9-357440fbec52', 'product_update', 'New Product Added', 'New product added: Bhagalpuri saree', '2025-08-23 19:29:52.583677+00', true, 'medium', NULL, '29af51a2-c26c-4362-a4c0-1284bfa943eb', NULL),
	('44697e7a-3500-4010-87d8-1cc93399fbf4', 'gi_verification', 'GI Status Approved', 'Product "chanderi saree" GI status: Approved', '2025-08-24 09:30:16.729572+00', true, 'high', NULL, '35951b54-da99-4fb9-96fa-25865c69f90c', NULL),
	('a012b055-4658-4f74-a973-cdcfd203b50a', 'gi_verification', 'GI Status Approved', 'Product "Alphonso Mango" GI status: Approved', '2025-08-24 09:43:20.549108+00', true, 'high', NULL, 'da80ea29-6d40-4fdf-a269-b3c49ecd0d5a', NULL),
	('7bdac0eb-badd-4e22-8cc0-6b040e97180f', 'product_update', 'New Product Added', 'New product added: Muga Silk', '2025-08-24 09:48:41.069048+00', true, 'medium', NULL, '6f782736-35e5-472d-8737-6b063e428d20', NULL),
	('cbb409dd-0375-4ac7-ac87-cd5c0676ffeb', 'product_update', 'New Product Added', 'New product added: chanderi saree', '2025-08-24 09:39:07.050199+00', true, 'medium', NULL, 'f838bdeb-62f0-46bb-a19f-b4a2bcece524', NULL),
	('e10c0963-17be-4111-8236-47886cc5249b', 'product_update', 'New Product Added', 'New product added: Alphonso Mango', '2025-08-24 09:40:42.630486+00', true, 'medium', NULL, 'da80ea29-6d40-4fdf-a269-b3c49ecd0d5a', NULL),
	('32a44e7f-3f98-449a-b983-a6b09750961d', 'product_update', 'New Product Added', 'New product added: madhubani art', '2025-08-24 09:33:32.803582+00', true, 'medium', NULL, '05aa9222-03af-4641-8558-98bdddf2d86f', NULL),
	('0f9f0518-32cb-4dd9-b3bc-2206ef2ce15d', 'product_update', 'New Product Added', 'New product added: Phulkari dupatta', '2025-08-25 16:42:07.87379+00', false, 'medium', NULL, '6f448326-c81b-44d7-8de9-f45c2857b251', NULL),
	('b14406d3-b987-4dbf-9fcd-344dcd744e96', 'gi_verification', 'GI Status Approved', 'Product "Phulkari dupatta" GI status: Approved', '2025-08-25 16:42:33.833153+00', false, 'high', NULL, '6f448326-c81b-44d7-8de9-f45c2857b251', NULL),
	('38cf4801-4a02-4a8d-952b-01bd44dde0aa', 'vendor_update', 'New Vendor Registration', 'New vendor registered: tester1', '2025-08-26 17:44:44.258751+00', false, 'medium', NULL, 'c46a29f5-2ccf-48ca-8feb-3457bdf1b47a', NULL),
	('64758709-3cc8-4cf3-a09c-067833352cb7', 'gi_verification', 'GI Status Approved', 'Product "Bhagalpuri saree" GI status: Approved', '2025-09-05 18:07:41.217066+00', false, 'high', NULL, '84bb857c-f983-4e6f-b69f-08df6ac5dde8', NULL),
	('2691bb65-ccf0-47a6-8ad6-c16ab014c4e8', 'product_update', 'New Product Added', 'New product added: kashmiri saffron', '2025-09-05 18:14:04.377984+00', false, 'medium', NULL, '9f9d224e-b847-429f-8610-5f4fbdf0bc26', NULL),
	('ebf0776b-b10e-4ed5-88ae-bf5e5e8af3ad', 'gi_verification', 'GI Status Approved', 'Product "kashmiri saffron" GI status: Approved', '2025-09-05 18:15:05.223114+00', false, 'high', NULL, '9f9d224e-b847-429f-8610-5f4fbdf0bc26', NULL),
	('19762012-cd7e-4e76-a510-7b1ab70c0f63', 'product_update', 'New Product Added', 'New product added: mysore sandal soap', '2025-09-10 18:17:10.190128+00', false, 'medium', NULL, '4ffaae0f-a36d-4018-9c89-be1a47d2da41', NULL),
	('926de3ec-8e4f-47c9-8d1d-cec05d589752', 'gi_verification', 'GI Status Approved', 'Product "mysore sandal soap" GI status: Approved', '2025-09-10 18:18:07.757405+00', false, 'high', NULL, '4ffaae0f-a36d-4018-9c89-be1a47d2da41', NULL),
	('439df322-c29c-48cd-899d-bf92a3c5146e', 'product_update', 'New Product Added', 'New product added: darjeeling tea', '2025-09-10 18:37:25.45762+00', false, 'medium', NULL, '2ff054e4-6e72-445e-8b29-b9bcca909c35', NULL),
	('e71fac21-1388-4c7b-a2df-188bbfafc4c2', 'product_update', 'New Product Added', 'New product added: mysore sandal soap', '2025-09-10 18:50:53.632231+00', false, 'medium', NULL, 'e507b7f1-57ac-4126-b544-5a1b4dfba39e', NULL),
	('6071badd-d0c1-42a0-9c8d-d04bdf14fb61', 'gi_verification', 'GI Status Approved', 'Product "mysore sandal soap" GI status: Approved', '2025-09-10 18:51:19.761087+00', false, 'high', NULL, 'e507b7f1-57ac-4126-b544-5a1b4dfba39e', NULL),
	('d125e06c-50e2-4fd0-94d9-09d17c4213b9', 'product_update', 'New Product Added', 'New product added: mysore sandal soap', '2025-09-14 12:57:04.369327+00', false, 'medium', NULL, '2790b974-1238-475a-a938-a4499f0af317', NULL),
	('152d8377-8cf0-4ce2-8a78-29eade605d74', 'product_update', 'New Product Added', 'New product added: Muga Silk of Assam', '2025-09-14 13:08:48.373763+00', false, 'medium', NULL, 'cdd5298d-39cf-4d05-8674-5ff8b7509962', NULL),
	('90c4a430-f683-41ac-90da-f2d79d6b5fea', 'product_update', 'New Product Added', 'New product added: Muga Silk of Assam', '2025-09-14 13:11:12.349997+00', false, 'medium', NULL, '4b545be0-6b56-4426-afb8-a0aa40b7f8d7', NULL),
	('c63e84c3-c0b3-4c2f-bcad-041b060c95bc', 'product_update', 'New Product Added', 'New product added: Coorg coffee ', '2025-09-14 17:39:55.137042+00', false, 'medium', NULL, '97a4c80c-8903-497f-9a2a-b946369e0206', NULL),
	('516a9e61-ba1a-4fcc-9a2f-87f0384ba880', 'gi_verification', 'GI Status Approved', 'Product "Coorg coffee " GI status: Approved', '2025-09-14 17:40:18.574566+00', false, 'high', NULL, '97a4c80c-8903-497f-9a2a-b946369e0206', NULL),
	('5e1b38e8-8930-415c-96b7-13b19eb74352', 'product_update', 'New Product Added', 'New product added: mysore sandal soap', '2025-09-15 14:03:16.779675+00', false, 'medium', NULL, 'f1ac6f77-b065-4ab2-9cdc-0b502295489a', NULL),
	('c06c6698-d0fd-4d19-8690-6eb4db72c3ee', 'gi_verification', 'GI Status Approved', 'Product "mysore sandal soap" GI status: Approved', '2025-09-15 14:05:37.682533+00', false, 'high', NULL, 'f1ac6f77-b065-4ab2-9cdc-0b502295489a', NULL),
	('80c6be6c-2401-40ed-8814-9783ae3c6467', 'product_update', 'New Product Added', 'New product added: mysore sandal soap', '2025-09-15 15:04:16.371713+00', false, 'medium', NULL, '1b3f3c6f-47e8-4665-9cc3-40c9ba94dd76', NULL),
	('a1621e42-f4f4-461e-a2e3-204e048aa94c', 'gi_verification', 'GI Status Approved', 'Product "mysore sandal soap" GI status: Approved', '2025-09-15 15:04:51.991921+00', false, 'high', NULL, '1b3f3c6f-47e8-4665-9cc3-40c9ba94dd76', NULL),
	('1bf1b325-b06d-4d21-975c-8b12a0827d2c', 'product_update', 'New Product Added', 'New product added:  toys', '2025-09-15 16:00:00.246609+00', false, 'medium', NULL, 'b782a543-a60a-4e83-b7ee-5a51b97cb95c', NULL),
	('b5b49283-833d-4d2e-8e78-83a3cc8173c5', 'gi_verification', 'GI Status Approved', 'Product " toys" GI status: Approved', '2025-09-15 16:00:19.567764+00', false, 'high', NULL, 'b782a543-a60a-4e83-b7ee-5a51b97cb95c', NULL),
	('5413e282-69a2-4059-96f4-bb40e29eb92f', 'product_update', 'New Product Added', 'New product added: mysore sandal soap', '2025-09-19 06:22:21.940491+00', false, 'medium', NULL, '8fbe37c3-2eab-44a6-a32c-3c77c408d474', NULL),
	('0a94da78-ca96-4d35-957c-5b08973fee4e', 'product_update', 'New Product Added', 'New product added: mysore sandal soap', '2025-09-20 06:08:24.897624+00', false, 'medium', NULL, '3c0cea03-2fd3-4f5f-a528-2a138626261a', NULL),
	('e8b81698-da9c-431f-8e22-c1945c670474', 'product_update', 'New Product Added', 'New product added: mysore sandal soap', '2025-09-20 06:14:16.503756+00', false, 'medium', NULL, 'a8713973-737b-4a39-b80a-fe26fb785bdd', NULL),
	('4fde7ec4-52d8-4838-8352-e89eb0507e06', 'gi_verification', 'GI Status Approved', 'Product "mysore sandal soap" GI status: Approved', '2025-09-20 06:14:52.263031+00', false, 'high', NULL, 'a8713973-737b-4a39-b80a-fe26fb785bdd', NULL),
	('e61f4f90-1818-4dff-bc62-34281bd04382', 'product_update', 'New Product Added', 'New product added: mysore sandal soap', '2025-09-20 06:25:13.542594+00', false, 'medium', NULL, 'b0e8c47a-5530-47de-b1f0-e08e10773f99', NULL),
	('b04da003-b0c6-4044-92a9-f7f59886096d', 'gi_verification', 'GI Status Approved', 'Product "mysore sandal soap" GI status: Approved', '2025-09-20 06:25:48.682981+00', false, 'high', NULL, 'b0e8c47a-5530-47de-b1f0-e08e10773f99', NULL);


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."orders" ("id", "vendor_id", "customer_id", "product_id", "customer_name", "product_name", "product_image", "quantity", "unit_price", "total_price", "status", "shipping_address", "created_at", "updated_at") VALUES
	('b33c00d7-11ae-43d0-8d14-6474266e27b0', 'e3f02582-8e14-42a0-a28a-3fca8bfe2e93', '2b1b5bd6-aba0-45a3-b567-b928eadce1a2', 'f838bdeb-62f0-46bb-a19f-b4a2bcece524', 'Mali Balaji ', 'chanderi saree', 'https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/product-images/products/e3f02582-8e14-42a0-a28a-3fca8bfe2e93/0.3723331310476343.jpeg', 2, 1200, 2400, 'shipped', 'Default Address', '2025-08-24 18:07:01.880063+00', '2025-08-24 18:07:40.074972+00'),
	('d265adc4-1cc3-4874-8e39-0d8360276e0a', '30749095-60b5-40b8-9d2e-3dd8b137afe2', '2b1b5bd6-aba0-45a3-b567-b928eadce1a2', 'da80ea29-6d40-4fdf-a269-b3c49ecd0d5a', 'Mali Balaji ', 'Alphonso Mango', 'https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/product-images/products/30749095-60b5-40b8-9d2e-3dd8b137afe2/0.6765468677285892.jpg', 2, 499.99, 999.98, 'processing', 'Default Address', '2025-08-24 18:08:20.627429+00', '2025-08-24 18:08:53.582108+00'),
	('6d2c1d03-2323-436d-aeb9-dc624160da3d', 'e3f02582-8e14-42a0-a28a-3fca8bfe2e93', '4be41b5c-6079-442e-86ea-0e7c2f118786', '6f448326-c81b-44d7-8de9-f45c2857b251', 'shafinaz', 'Phulkari dupatta', 'https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/product-images/products/e3f02582-8e14-42a0-a28a-3fca8bfe2e93/0.2770358051029608.jpeg', 3, 1000, 3000, 'shipped', 'Default Address', '2025-08-25 16:43:41.979649+00', '2025-08-25 16:44:11.647331+00'),
	('83b6129c-762a-412c-a2f6-a3865448ad10', 'e3f02582-8e14-42a0-a28a-3fca8bfe2e93', '30749095-60b5-40b8-9d2e-3dd8b137afe2', '6f448326-c81b-44d7-8de9-f45c2857b251', 'KarNesara Heritage Crafts', 'Phulkari dupatta', 'https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/product-images/products/e3f02582-8e14-42a0-a28a-3fca8bfe2e93/0.2770358051029608.jpeg', 1, 1000, 1000, 'pending', 'Default Address', '2025-08-26 17:25:36.275142+00', '2025-08-26 17:25:36.275142+00'),
	('aef5307d-bff2-4683-b866-c804c928949e', 'e3f02582-8e14-42a0-a28a-3fca8bfe2e93', '11c3a3c4-61a7-4c00-8c77-454fbc2cb591', '6f448326-c81b-44d7-8de9-f45c2857b251', 'prachi', 'Phulkari dupatta', 'https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/product-images/products/e3f02582-8e14-42a0-a28a-3fca8bfe2e93/0.2770358051029608.jpeg', 1, 1000, 1000, 'pending', 'Default Address', '2025-09-01 16:15:43.850346+00', '2025-09-01 16:15:43.850346+00'),
	('17d05e93-28de-4e4a-9d62-26c0d2cee559', '88e38428-86e7-41be-92d8-8c51a61128a5', '2b1b5bd6-aba0-45a3-b567-b928eadce1a2', '9f9d224e-b847-429f-8610-5f4fbdf0bc26', 'Balaji  M', 'kashmiri saffron', 'https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/product-images/products/88e38428-86e7-41be-92d8-8c51a61128a5/0.39031574251558276.jpeg', 3, 700, 2100, 'delivered', 'Default Address', '2025-09-05 18:18:40.307656+00', '2025-09-05 18:19:31.764846+00'),
	('8e214e1f-75a8-4f67-8ebd-4734833cb41b', '88e38428-86e7-41be-92d8-8c51a61128a5', '2b1b5bd6-aba0-45a3-b567-b928eadce1a2', '9f9d224e-b847-429f-8610-5f4fbdf0bc26', 'Balaji  M', 'kashmiri saffron', 'https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/product-images/products/88e38428-86e7-41be-92d8-8c51a61128a5/0.39031574251558276.jpeg', 1, 700, 700, 'pending', 'Default Address', '2025-09-11 17:36:22.154164+00', '2025-09-11 17:36:22.154164+00'),
	('235af71a-20d3-4902-82c9-32374d2cdc21', '30749095-60b5-40b8-9d2e-3dd8b137afe2', '2b1b5bd6-aba0-45a3-b567-b928eadce1a2', 'da80ea29-6d40-4fdf-a269-b3c49ecd0d5a', 'Balaji  M', 'Alphonso Mango', 'https://jumcsxhftlhxzmeqpuvb.supabase.co/storage/v1/object/public/product-images/products/30749095-60b5-40b8-9d2e-3dd8b137afe2/0.6765468677285892.jpg', 1, 499.99, 499.99, 'cancelled', 'Default Address', '2025-09-07 17:34:13.996196+00', '2025-09-15 15:36:45.19871+00');


--
-- Data for Name: vendor_notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: vendor_subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- PostgreSQL database dump complete
--

RESET ALL;
