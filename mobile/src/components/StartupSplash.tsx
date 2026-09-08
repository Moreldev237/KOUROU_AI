import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { colors } from "@/theme";

const PARTICLE_TARGETS = Array.from({ length: 42 }, (_, index) => {
  const angle = (index / 42) * Math.PI * 2;
  const radiusX = 46 + (index % 5) * 13;
  const radiusY = 58 + (index % 4) * 12;
  return {
    x: Math.cos(angle) * radiusX,
    y: Math.sin(angle) * radiusY - 20,
    size: index % 7 === 0 ? 5 : 3,
    color: index % 3 === 0 ? colors.accentGreen : colors.accentSky,
    delay: (index % 8) * 35,
  };
});

function Particle({ target }: { target: (typeof PARTICLE_TARGETS)[number] }) {
  const position = useRef(new Animated.ValueXY({
    x: (Math.random() - 0.5) * 360,
    y: (Math.random() - 0.5) * 520,
  })).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(position, {
        toValue: { x: target.x, y: target.y },
        duration: 1050,
        delay: target.delay,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(target.delay),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.delay(700),
        Animated.timing(opacity, { toValue: 0.25, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();
  }, [opacity, position, target]);

  return (
    <Animated.View
      style={[
        styles.particle,
        { width: target.size, height: target.size, borderRadius: target.size / 2, backgroundColor: target.color },
        { opacity, transform: position.getTranslateTransform() },
      ]}
    />
  );
}

export function StartupSplash({ onFinished }: { onFinished: () => void }) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.72)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 650, delay: 760, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, delay: 760, friction: 8, useNativeDriver: true }),
    ]).start();

    const timeout = setTimeout(onFinished, 2350);
    return () => clearTimeout(timeout);
  }, [logoOpacity, logoScale, onFinished]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.particleField}>
        {PARTICLE_TARGETS.map((target, index) => <Particle key={index} target={target} />)}
      </View>
      <Animated.View style={[styles.logoFrame, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}> 
        <Animated.Image
          source={require("@/../assets/icon.png")}
          style={styles.logo}
          resizeMode="cover"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.primaryDark, alignItems: "center", justifyContent: "center" },
  particleField: { position: "absolute", width: 1, height: 1, alignItems: "center", justifyContent: "center" },
  particle: { position: "absolute" },
  logoFrame: { width: 230, height: 230, borderRadius: 58, overflow: "hidden" },
  logo: { width: 230, height: 230 },
});