import * as Network from "expo-network";
import { useEffect, useState } from "react";

export function useNetworkState() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let mounted = true;
    void Network.getNetworkStateAsync()
      .then((state) => {
        if (mounted) setIsOnline(state.isConnected !== false);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  return { isOnline };
}
