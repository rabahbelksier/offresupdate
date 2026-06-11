import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import DrawerNavigator from "@/navigation/DrawerNavigator";
import AuthNavigator from "@/navigation/AuthNavigator";
import ProductDetailsScreen from "@/screens/ProductDetailsScreen";
import TrendingOffersScreen from "@/screens/TrendingOffersScreen";
import OfferDetailsScreen from "@/screens/OfferDetailsScreen";
import SimilarProductsScreen from "@/screens/SimilarProductsScreen";
import AdminAddCouponScreen from "@/screens/admin/AdminAddCouponScreen";
import AdminAddCalendrierScreen from "@/screens/admin/AdminAddCalendrierScreen";
import AdminAddCoinScreen from "@/screens/admin/AdminAddCoinScreen";
import AdminAddOffreScreen from "@/screens/admin/AdminAddOffreScreen";
import AdminEditCalendrierScreen from "@/screens/admin/AdminEditCalendrierScreen";
import AdminEditCoinScreen from "@/screens/admin/AdminEditCoinScreen";
import AdminEditOffreScreen from "@/screens/admin/AdminEditOffreScreen";
import AdminEditCouponScreen from "@/screens/admin/AdminEditCouponScreen";
import SupportChatScreen from "@/screens/SupportChatScreen";
import AdminChatsListScreen from "@/screens/admin/AdminChatsListScreen";
import AdminChatDetailScreen from "@/screens/admin/AdminChatDetailScreen";
import UserOfferRequestScreen from "@/screens/UserOfferRequestScreen";
import UserOfferResultScreen from "@/screens/UserOfferResultScreen";
import AdminOfferRequestsScreen from "@/screens/admin/AdminOfferRequestsScreen";
import AdminOfferRequestDetailScreen from "@/screens/admin/AdminOfferRequestDetailScreen";
import AdminOfferHistoryScreen from "@/screens/admin/AdminOfferHistoryScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors } from "@/constants/theme";
import type { ProductItem } from "@/lib/storage";

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ProductDetails: { product: ProductItem; hideOffers?: boolean; bestSeller?: boolean };
  TrendingOffers: undefined;
  OfferDetails: { offer: any; country?: string };
  SimilarProducts: { productTitle: string; productId?: string };
  AdminAddCoupon: undefined;
  AdminAddCalendrier: undefined;
  AdminAddCoin: undefined;
  AdminAddOffre: undefined;
  AdminEditCalendrier: { id: number; title: string; linkImg: string; info: string; titleEn?: string; titleFr?: string; titlePt?: string; infoEn?: string; infoFr?: string; infoPt?: string };
  AdminEditCoin: { id: number; title: string; titleEn?: string; titleFr?: string; titlePt?: string; link: string; info: string; infoEn?: string; infoFr?: string; infoPt?: string };
  AdminEditOffre: { id: number; title: string; price: string; sellerCoupon: string; productUrl: string; info: string; country: string; currentPrice?: string; imageUrl?: string };
  AdminEditCoupon: { row: any };
  SupportChat: undefined;
  AdminChatsList: undefined;
  AdminChatDetail: { userId: string; userName: string };
  UserOfferRequest: undefined;
  UserOfferResult: { request: any };
  AdminOfferRequests: undefined;
  AdminOfferRequestDetail: { request: any };
  AdminOfferHistory: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions({ transparent: false });
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
        {isAuthenticated ? (
          <>
            <Stack.Screen
              name="Main"
              component={DrawerNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ProductDetails"
              component={ProductDetailsScreen}
              options={{
                headerTitle: t("product_details_title"),
                presentation: "card",
              }}
            />
            <Stack.Screen
              name="TrendingOffers"
              component={TrendingOffersScreen}
              options={{
                headerTitle: t("trending_offers_title"),
              }}
            />
            <Stack.Screen
              name="OfferDetails"
              component={OfferDetailsScreen}
              options={{
                headerTitle: t("offer_details_title"),
              }}
            />
            <Stack.Screen
              name="SimilarProducts"
              component={SimilarProductsScreen}
              options={{
                headerTitle: t("similar_products_title"),
              }}
            />
            <Stack.Screen
              name="AdminAddCoupon"
              component={AdminAddCouponScreen}
              options={{ headerTitle: t("add_coupon_title") }}
            />
            <Stack.Screen
              name="AdminAddCalendrier"
              component={AdminAddCalendrierScreen}
              options={{ headerTitle: t("add_entry_title") }}
            />
            <Stack.Screen
              name="AdminAddCoin"
              component={AdminAddCoinScreen}
              options={{ headerTitle: t("add_entry_title") }}
            />
            <Stack.Screen
              name="AdminAddOffre"
              component={AdminAddOffreScreen}
              options={{ headerTitle: t("add_offre_title") }}
            />
            <Stack.Screen
              name="AdminEditCalendrier"
              component={AdminEditCalendrierScreen}
              options={{ headerTitle: t("edit_entry_title") }}
            />
            <Stack.Screen
              name="AdminEditCoin"
              component={AdminEditCoinScreen}
              options={{ headerTitle: t("edit_entry_title") }}
            />
            <Stack.Screen
              name="AdminEditOffre"
              component={AdminEditOffreScreen}
              options={{ headerTitle: t("edit_offre_title") }}
            />
            <Stack.Screen
              name="AdminEditCoupon"
              component={AdminEditCouponScreen}
              options={{ headerTitle: t("edit_coupon_title") }}
            />
            <Stack.Screen
              name="SupportChat"
              component={SupportChatScreen}
              options={{ headerTitle: t("support_chat") }}
            />
            <Stack.Screen
              name="AdminChatsList"
              component={AdminChatsListScreen}
              options={{ headerTitle: t("user_chats") }}
            />
            <Stack.Screen
              name="AdminChatDetail"
              component={AdminChatDetailScreen}
              options={({ route }) => ({ headerTitle: (route.params as any).userName || t("user_chats") })}
            />
            <Stack.Screen
              name="UserOfferRequest"
              component={UserOfferRequestScreen}
              options={{ headerTitle: t("ai_offer_request") }}
            />
            <Stack.Screen
              name="UserOfferResult"
              component={UserOfferResultScreen}
              options={{ headerTitle: t("offer_request_processed") }}
            />
            <Stack.Screen
              name="AdminOfferRequests"
              component={AdminOfferRequestsScreen}
              options={{ headerTitle: t("admin_offer_requests") }}
            />
            <Stack.Screen
              name="AdminOfferRequestDetail"
              component={AdminOfferRequestDetailScreen}
              options={{ headerTitle: t("offer_request_admin_title") }}
            />
            <Stack.Screen
              name="AdminOfferHistory"
              component={AdminOfferHistoryScreen}
              options={{ headerTitle: t("offer_request_history_title") }}
            />
          </>
        ) : (
          <Stack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{ headerShown: false }}
          />
        )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
