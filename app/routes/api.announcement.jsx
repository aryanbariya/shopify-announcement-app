import { authenticate } from "../shopify.server";
import dbConnect from "../db/mongodb.server";
import Announcement from "../models/Announcement.server";

// GET: Fetch the current announcement metafield from Shopify
export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  try {
    const response = await admin.graphql(
      `#graphql
      query getShopMetafield {
        shop {
          metafield(namespace: "my_app", key: "announcement") {
            value
          }
        }
      }`
    );

    const jsonResponse = await response.json();
    const value = jsonResponse.data?.shop?.metafield?.value || "";

    return { announcement: value };
  } catch (error) {
    console.error("Error loading announcement metafield:", error);
    return { announcement: "" };
  }
};

// POST: Save announcement to MongoDB and sync with Shopify shop metafield
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { announcement } = body;

    if (announcement === undefined || announcement === null) {
      return Response.json({ error: "Announcement text is required" }, { status: 400 });
    }

    // Connect to MongoDB
    await dbConnect();

    // 1. Save new announcement to MongoDB (maintains audit history)
    const newAnnouncement = await Announcement.create({
      announcement: announcement.trim(),
    });

    // 2. Fetch the Shop GID to set metafields on the Shop owner
    const shopResponse = await admin.graphql(
      `#graphql
      query getShopId {
        shop {
          id
        }
      }`
    );
    const shopJson = await shopResponse.json();
    const shopId = shopJson.data?.shop?.id;

    if (!shopId) {
      throw new Error("Failed to retrieve shop ID");
    }

    // 3. Update the Shop metafield using Admin GraphQL API
    const metafieldResponse = await admin.graphql(
      `#graphql
      mutation setShopMetafield($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
            value
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          metafields: [
            {
              ownerId: shopId,
              namespace: "my_app",
              key: "announcement",
              value: announcement.trim(),
              type: "single_line_text_field",
            },
          ],
        },
      }
    );

    const metafieldJson = await metafieldResponse.json();
    const userErrors = metafieldJson.data?.metafieldsSet?.userErrors || [];

    if (userErrors.length > 0) {
      console.error("Metafield user errors:", userErrors);
      return Response.json({ error: userErrors[0].message }, { status: 400 });
    }

    return {
      success: true,
      announcement: newAnnouncement.announcement,
      createdAt: newAnnouncement.createdAt,
    };
  } catch (error) {
    console.error("Error in announcement API action:", error);
    return Response.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
};
