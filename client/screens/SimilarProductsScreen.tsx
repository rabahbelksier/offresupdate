import React from "react";
import { View, StyleSheet } from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";

import { ThemedView } from "@/components/ThemedView";
import { SmartMatchView } from "@/components/SmartMatchView";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type SimilarProductsRouteProp = RouteProp<RootStackParamList, "SimilarProducts">;

export default function SimilarProductsScreen() {
  const route = useRoute<SimilarProductsRouteProp>();
  const { productTitle, productId } = route.params || {};

  return (
    <ThemedView style={styles.container}>
      <SmartMatchView keywords={productTitle} productId={productId} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
