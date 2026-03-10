import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  integrations: [
    starlight({
      title: "Smart Order Docs",
      head: [],
      sidebar: [
        {
          label: "Docs",
          items: [
            { label: "Overview", link: "/" },
            { label: "Use Cases", link: "/use-cases/" },
            { label: "Dev Setup", link: "/dev-setup/" }
          ]
        }
      ]
    })
  ]
});
