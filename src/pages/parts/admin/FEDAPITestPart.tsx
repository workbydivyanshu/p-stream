import { useState } from "react";
import { useAsyncFn } from "react-use";

import { Button } from "@/components/buttons/Button";
import { Icon, Icons } from "@/components/Icon";
import { Box } from "@/components/layout/Box";
import { Spinner } from "@/components/layout/Spinner";
import { Heading2 } from "@/components/utils/Text";

export function FEDAPITestPart() {
  const [status, setStatus] = useState({
    hasTested: false,
    success: false,
    errorText: "",
    tokenStatus: "",
  });

  const [testState, runTests] = useAsyncFn(async () => {
    setStatus({
      hasTested: false,
      success: false,
      errorText: "",
      tokenStatus: "",
    });

    try {
      const response = await fetch(
        "https://fed-api.up.railway.app/token/status",
      );
      const data = await response.json();

      if (!response.ok) {
        return setStatus({
          hasTested: true,
          success: false,
          errorText: data.message || "Not found",
          tokenStatus: "",
        });
      }

      return setStatus({
        hasTested: true,
        success: true,
        errorText: "",
        tokenStatus: data.status,
      });
    } catch (err) {
      return setStatus({
        hasTested: true,
        success: false,
        errorText:
          "Failed to connect to FED API, please check your internet connection",
        tokenStatus: "",
      });
    }
  }, [setStatus]);

  return (
    <>
      <Heading2 className="mb-8 mt-12">FED API test</Heading2>
      <Box>
        <div className="flex items-center">
          <div className="flex-1">
            {!status.hasTested ? (
              <p>Run the test to check FED API status</p>
            ) : status.success ? (
              <div>
                <p className="flex items-center">
                  <Icon
                    icon={Icons.CIRCLE_CHECK}
                    className="text-video-scraping-success mr-2"
                  />
                  FED API is working
                </p>
                <p className="mt-2">Current status: {status.tokenStatus}</p>
              </div>
            ) : (
              <>
                <p className="text-white font-bold w-full mb-3 flex items-center gap-1">
                  <Icon
                    icon={Icons.CIRCLE_EXCLAMATION}
                    className="text-video-scraping-error mr-2"
                  />
                  FED API is not working
                </p>
                <p>{status.errorText}</p>
              </>
            )}
          </div>
          <Button theme="purple" onClick={runTests}>
            {testState.loading ? <Spinner className="text-base mr-2" /> : null}
            Test FED API
          </Button>
        </div>
      </Box>
    </>
  );
}
