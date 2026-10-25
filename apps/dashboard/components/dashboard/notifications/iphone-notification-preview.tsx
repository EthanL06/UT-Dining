"use client";

import { Box, Flex, Group, Text } from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { NotificationData } from "@/app/(private)/dashboard/notifications/action";
import Image from "next/image";

interface IPhoneNotificationPreviewProps {
  data: NotificationData;
}

export function IPhoneNotificationPreview({
  data,
}: IPhoneNotificationPreviewProps) {
  const currentTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Box
      style={{
        height: "852px",
        backgroundColor: "#000",
        borderRadius: "40px",
        padding: "0",
        margin: "0 auto",
        position: "relative",
        border: "8px solid #1d1d1f",
        boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
      }}
    >
      {/* iPhone Dynamic Island */}
      <Box
        style={{
          width: "126px",
          height: "37px",
          backgroundColor: "#000",
          borderRadius: "19px",
          position: "absolute",
          top: "10px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 2,
          border: "1px solid #333",
        }}
      />

      {/* Status bar area */}
      <Box
        style={{
          padding: "60px 24px 0px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: "17px",
            fontWeight: "600",
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
          }}
        >
          {currentTime}
        </Text>
        <Box style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          {/* Signal bars */}
          <Box style={{ display: "flex", gap: "2px" }}>
            {[1, 2, 3, 4].map((bar) => (
              <Box
                key={bar}
                style={{
                  width: "3px",
                  height: `${bar * 2 + 4}px`,
                  backgroundColor: "white",
                  borderRadius: "1px",
                }}
              />
            ))}
          </Box>
          {/* WiFi icon */}
          <Box
            style={{
              width: "15px",
              height: "11px",
              backgroundColor: "white",
              borderRadius: "2px 2px 0 0",
              marginLeft: "8px",
              position: "relative",
            }}
          >
            <Box
              style={{
                position: "absolute",
                top: "3px",
                left: "3px",
                width: "9px",
                height: "5px",
                backgroundColor: "#000",
                borderRadius: "1px 1px 0 0",
              }}
            />
          </Box>
          {/* Battery */}
          <Box
            style={{
              width: "24px",
              height: "12px",
              border: "1px solid white",
              borderRadius: "3px",
              marginLeft: "8px",
              position: "relative",
            }}
          >
            <Box
              style={{
                position: "absolute",
                right: "-3px",
                top: "3px",
                width: "2px",
                height: "6px",
                backgroundColor: "white",
                borderRadius: "0 1px 1px 0",
              }}
            />
            <Box
              style={{
                position: "absolute",
                left: "1px",
                top: "1px",
                width: "16px",
                height: "8px",
                backgroundColor: "white",
                borderRadius: "1px",
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Lock screen background */}
      <Box
        style={{
          position: "absolute",
          top: "0",
          left: "0",
          right: "0",
          bottom: "0",
          background:
            "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          borderRadius: "32px",
          zIndex: -1,
        }}
      />

      {/* Notification container */}
      <Box
        style={{
          padding: "0 16px",
          marginTop: "40px",
        }}
      >
        {/* Notification */}
        <Flex
          gap="sm"
          align="center"
          style={{
            width: "365px",
            backgroundColor: "rgba(44, 44, 46, 0.95)",
            borderRadius: "16px",
            padding: "16px",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          }}
        >
          <Box
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Image src="/logo.png" alt="logo" width={40} height={40} />
          </Box>

          <Box className="w-full">
            <Flex className="mb-1" gap="sm" align="center">
              <Flex justify="space-between" align="center" style={{ flex: 1 }}>
                <Text
                  style={{
                    color: "white",
                    fontSize: "15px",
                    fontWeight: "600",
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
                    lineHeight: "1.2",
                  }}
                  lineClamp={1}
                >
                  {data.title}
                </Text>
                <Text
                  style={{
                    color: "rgba(255, 255, 255, 0.6)",
                    fontSize: "13px",
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
                    lineHeight: "1.2",
                  }}
                >
                  now
                </Text>
              </Flex>
            </Flex>

            <Text
              style={{
                color: "rgba(255, 255, 255, 0.8)",
                fontSize: "15px",
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
                lineHeight: "1.4",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
              lineClamp={3}
            >
              {data.body}
            </Text>
          </Box>
        </Flex>
      </Box>

      {/* Home indicator */}
      <Box
        style={{
          position: "absolute",
          bottom: "8px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "134px",
          height: "5px",
          backgroundColor: "rgba(255, 255, 255, 0.3)",
          borderRadius: "3px",
        }}
      />
    </Box>
  );
}
