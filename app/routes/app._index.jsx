import { useState } from "react";
import { useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  AppProvider as PolarisProvider,
  Page,
  Layout,
  Card,
  TextField,
  Button,
  BlockStack,
  Text,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

// Loader to fetch current metafield value when dashboard loads
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
    console.error("Error loading initial announcement metafield:", error);
    return { announcement: "" };
  }
};

export default function Index() {
  const { announcement: initialAnnouncement } = useLoaderData();
  const [announcement, setAnnouncement] = useState(initialAnnouncement);
  const [isSaving, setIsSaving] = useState(false);
  const shopify = useAppBridge();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/announcement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ announcement }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        shopify.toast.show("Announcement saved and synced successfully!");
      } else {
        shopify.toast.show(data.error || "Failed to save announcement.", { isError: true });
      }
    } catch (error) {
      console.error("Save error:", error);
      shopify.toast.show("An error occurred while saving the announcement.", { isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PolarisProvider>
      <Page title="Announcement Banner Dashboard">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingMd">
                  Manage Storefront Announcement
                </Text>
                <Text as="p" tone="subdued">
                  Customize the banner announcement message that displays on your storefront. Saving updates the MongoDB audit history and updates the live theme banner.
                </Text>
                
                <TextField
                  label="Announcement Message"
                  value={announcement}
                  onChange={(val) => setAnnouncement(val)}
                  multiline={3}
                  placeholder="e.g. Free shipping on all orders over $50!"
                  autoComplete="off"
                  maxLength={200}
                  showCharacterCount
                />

                <Box>
                  <Button
                    variant="primary"
                    loading={isSaving}
                    onClick={handleSave}
                  >
                    Save Announcement
                  </Button>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Theme Integration Instructions
                </Text>
                <Text as="p" tone="subdued">
                  To display this announcement banner on your store:
                </Text>
                <Text as="p" tone="subdued">
                  1. Navigate to your **Shopify Theme Online Store &rarr; Customize**.
                </Text>
                <Text as="p" tone="subdued">
                  2. Go to **App embeds** on the left panel.
                </Text>
                <Text as="p" tone="subdued">
                  3. Enable the **Announcement Banner** app embed block.
                </Text>
                <Text as="p" tone="subdued">
                  4. Click **Save** in the theme editor.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </PolarisProvider>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
