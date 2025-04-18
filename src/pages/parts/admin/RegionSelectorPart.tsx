import { Dropdown } from "@/components/form/Dropdown";
import { Box } from "@/components/layout/Box";
import { Heading2 } from "@/components/utils/Text";
import { Region, useRegionStore } from "@/utils/detectRegion";

export function RegionSelectorPart() {
  const { region, setRegion } = useRegionStore();

  const regionOptions = [
    { id: "us-east", name: "US East" },
    { id: "us-west", name: "US West" },
    { id: "south", name: "US Middle" },
    { id: "asia", name: "Asia Pacific" },
    { id: "europe", name: "Europe Central" },
  ];

  return (
    <>
      <Heading2 className="mb-8 mt-12">Region Selector</Heading2>
      <Box>
        <div className="flex items-center">
          <div className="flex-1">
            <p className="max-w-[20rem] font-medium">
              Manually select your preferred region for FED API. This will
              override automatic region detection.
            </p>
          </div>
          <Dropdown
            options={regionOptions}
            selectedItem={{
              id: region || "us-east",
              name:
                regionOptions.find((r) => r.id === region)?.name ||
                "Unknown (US East)",
            }}
            setSelectedItem={(item) => setRegion(item.id as Region, true)}
            direction="up"
          />
        </div>
        <p className="max-w-[30rem] text-type-danger">
          Use with caution. Changing the region could reset your token!
        </p>
      </Box>
    </>
  );
}
