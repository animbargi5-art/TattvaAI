import "../../styles/investigation-card.css";

import InvestigationCard from "./InvestigationCard";

export default function InvestigationList({

    investigations

}) {

    if (investigations.length === 0) {

        return (

            <p>No investigations found.</p>

        );

    }

    return (

        <div>

            {

                investigations.map(

                    (investigation) => (

                        <InvestigationCard
                            key={investigation.investigation_id || investigation.id || investigation.incident_id}
                            investigation={investigation}
                        />

                    )

                )

            }

        </div>

    );

}