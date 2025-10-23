import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const DiagnosticsNavButton: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => navigate("/Diagnostics")}
      className="ml-2 text-xs border border-dashed border-primary/40 hover:bg-primary/10"
      style={{ fontFamily: "monospace" }}
    >
      Diagnostics
    </Button>
  );
};

export default DiagnosticsNavButton;
