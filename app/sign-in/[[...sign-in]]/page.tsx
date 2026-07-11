"use client"

import { SignIn } from "@clerk/nextjs"
import { SplitAuthLayout } from "@/components/auth/split-auth-layout"
import { RightAuthPanel } from "@/components/auth/right-auth-panel"

const clerkAppearance = {
  variables: {
    colorPrimary: "#E6192E",
    colorBackground: "#1A1A1C",
    colorInputBackground: "#2D2D30",
    colorInputText: "#F4F4F5",
    colorText: "#F4F4F5",
    colorDanger: "#EF4444",
    colorSuccess: "#10B981",
    borderRadius: "1rem",
    colorTextOnPrimaryBackground: "#FFFFFF",
  },
  elements: {
    rootBox: { width: "100%" },
    card: { background: "transparent", boxShadow: "none", borderWidth: "0" },
    headerTitle: { color: "#F4F4F5", fontSize: "2rem", fontWeight: "700" },
    headerSubtitle: { color: "#A1A1AA" },
    formFieldLabel: { color: "#F4F4F5" },
    formFieldInput: {
      backgroundColor: "#2D2D30",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "0.75rem",
      color: "#F4F4F5",
    },
    input: { color: "#F4F4F5" },
    formFieldInputPlaceholder: { color: "#F4F4F5" },
    formButtonPrimary: {
      backgroundColor: "#E6192E",
      borderRadius: "0.75rem",
      height: "48px",
    },
    formButtonPrimary_hover: {
      backgroundColor: "#b91c1c",
    },
    footerActionLink: { color: "#E6192E" },
    footerActionText: { color: "#A1A1AA" },
    socialButtonsBlockButton: {
      backgroundColor: "#2D2D30",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "0.75rem",
    },
    socialButtonsBlockButton_hover: {
      backgroundColor: "#3F3F46",
    },
    socialButtonsBlockButtonText: { color: "#F4F4F5" },
    formFieldErrorText: { color: "#F87171" },
    dividerLine: { backgroundColor: "rgba(255,255,255,0.1)" },
    dividerText: { color: "#A1A1AA" },
    otpInputField: {
      backgroundColor: "#2D2D30",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "0.75rem",
      color: "#F4F4F5",
    },
    identityPreviewText: { color: "#F4F4F5" },
    identityPreviewEditButton: { color: "#E6192E" },
  },
}

export default function SignInPage() {
  return (
    <SplitAuthLayout>
      <RightAuthPanel>
        <SignIn appearance={clerkAppearance} />
      </RightAuthPanel>
    </SplitAuthLayout>
  )
}
