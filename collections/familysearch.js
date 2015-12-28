// Parse FamilySearch
function parseFamilySearch(htmlstring, familymembers, relation) {
    relation = relation || "";
    if (relation === "") {
        var parsed = $(htmlstring.replace(/<img/ig, "<gmi"));
    } else {
        var parsed = $($.parseHTML(htmlstring.replace(/<img/ig, "<gmi")));
    }


    var focusdaterange = "";
    //console.log(htmlstring);
    //var fname = parsed.find('.name');
    var fname = parsed.find("#PersonSummarySection").find(".fs-person-vitals__name-full");
    console.log(fname);
    var focusperson = parseFamilyName($(fname[0]).text());

    document.getElementById("readstatus").innerText = focusperson;

    var genderval = "unknown";
    var profiledata = {name: focusperson, gender: genderval, status: relation.title};
    var burialdtflag = false;
    var buriallcflag = false;
    var deathdtflag = false;
    var aboutdata = "";
    var ftable = parsed.find("#LifeSketchVital");
    if (!exists(ftable[0])) {
        return {};
    }

    var fperson = $(ftable[0]).find(".conclusionData");

    // ---------------------- Profile Data --------------------
    for (var i = 0; i < fperson.length; i++) {
        var row = $(fperson[i]).text();
        if (exists(row) && row.length > 1) {
            var fieldname = row.toLowerCase().trim();
            if (fieldname.startsWith("sex") || fieldname.startsWith("gender")) {
                var fsplit = fieldname.split("\n");
                if (!exists(fsplit[1])) {
                    continue;
                }
                genderval = fsplit[1].trim();
                profiledata["gender"] = genderval;
            } else if (fieldname.startsWith("birth")) {
                var fsplit = fieldname.split("\n");
                if (!exists(fsplit[1])) {
                    continue;
                }
                var eventinfo = $($(fperson[i]).html());
                var data = parseFamilyDate(eventinfo);
                if (!$.isEmptyObject(data)) {
                    profiledata["birth"] = data;
                }
            } else if (fieldname.startsWith("death")) {
                var fsplit = fieldname.split("\n");
                if (!exists(fsplit[1])) {
                    continue;
                }
                if (fsplit[1].trim() === "deceased") {
                    profiledata["alive"] = false;
                    deathdtflag = true;
                    continue;
                } else if (fsplit[1].trim() === "living") {
                    profiledata["alive"] = true;
                    continue;
                }
                var eventinfo = $($(fperson[i]).html());
                var data = parseFamilyDate(eventinfo);
                if (!$.isEmptyObject(data)) {
                    if (exists(getDate(data))) {
                        deathdtflag = true;
                    }
                    profiledata["death"] = data;
                }
            } else if (fieldname.startsWith("christening") || fieldname.startsWith("baptism")) {
                var fsplit = fieldname.split("\n");
                if (!exists(fsplit[1])) {
                    continue;
                }
                var eventinfo = $($(fperson[i]).html());
                var data = parseFamilyDate(eventinfo);
                if (!$.isEmptyObject(data)) {
                    profiledata["baptism"] = data;
                }
            } else if (fieldname.startsWith("burial")) {
                var fsplit = fieldname.split("\n");
                if (!exists(fsplit[1])) {
                    continue;
                }
                var eventinfo = $($(fperson[i]).html());
                var data = parseFamilyDate(eventinfo);
                if (!$.isEmptyObject(data)) {
                    if (exists(getDate(data))) {
                        burialdtflag = true;
                    }
                    if (exists(getLocation(data))) {
                        buriallcflag = true;
                    }
                    profiledata["burial"] = data;
                }
            }
        }
    }

    var ftable = parsed.find("#LifeSketchNonVitalSection");
    if (exists(ftable[0])) {
        var fperson = $(ftable[0]).find(".conclusionData");
        if (exists(fperson[0])){
            for (var i = 0; i < fperson.length; i++) {
                var x = $(fperson[i]).html().replace("<br>", ": ");
                aboutdata += "\n" + $(x).text();
            }
        }
        aboutdata = aboutdata.trim();
    }

    if (relation === "") {
        focusgender = genderval;
    } else if (genderval === "unknown" && exists(relation.gender)) {
        genderval = relation.gender;
        profiledata["gender"] = genderval;
    }

    if (familymembers) {
        loadGeniData();
        var famid = 0;
    }
    var ftable = parsed.find(".spouses-and-children");

    var fscouple = $(ftable).find(".couple-wrapper");
    var fschildren = $(ftable).find(".children-wrapper").find(".fs-person-vitals");

    ftable = parsed.find(".parents-and-siblings");

    var fsparents = $(ftable).find(".couple-wrapper");
    var fssiblings = $(ftable).find(".children-wrapper").find(".fs-person-vitals");
   // console.log(fscouple);

    //console.log(fschildren);

    // ---------------------- Family Data --------------------
    if (familymembers) {
        // --- children ---
        if (exists(fschildren)) {
            for (var x = 0; x < fschildren.length; x++) {
                processFamilySearch(fschildren[x], "child", famid);
                famid++;
            }
        }
        if (exists(fscouple)) {
            for (var x = 0; x < fscouple.length; x++) {
                var data = getFSMarriageInfo(fscouple[x]);
                var fsset = $(fscouple[x]).find(".fs-person-vitals");

                for (var y=0; y < fsset.length; y++) {
                    var valid = processFamilySearch(fsset[y], "spouse", famid, data);
                    if (valid) {
                        myhspouse.push(famid);
                        famid++;
                    }
                }
            }
        }
        if (exists(fsparents)) {
            var data = getFSMarriageInfo(fsparents[0]);
            var fsset = $(fsparents[0]).find(".fs-person-vitals");
            for (var y=0; y < 2; y++) {
                if (y === 0) {
                    processFamilySearch(fsset[y], "parents", famid, data);
                } else {
                    processFamilySearch(fsset[y], "parents", famid);
                }
                famid++;
            }
        }
        if (exists(fssiblings)) {
            for (var x = 0; x < fssiblings.length; x++) {
                processFamilySearch(fssiblings[x], "siblings", famid);
                famid++;
            }
        }
/**
        for (var x = 1; x < ftable.length; x++) {
            var fperson = $(ftable[x]).find(".factLabel");
            for (var i = 0; i < fperson.length; i++) {
                var row = $(fperson[i]).text();
                if (exists(row) && row.length > 1) {
                    var fieldname = row.toLowerCase().trim();
                    if (fieldname.startsWith("father:")) {
                        processFamilySearch($(fperson[i]).next("td"), "father", famid);
                        famid++;
                    } else if (fieldname.startsWith("mother:")) {
                        processFamilySearch($(fperson[i]).next("td"), "mother", famid);
                        famid++;
                    } else if (fieldname.startsWith("spouse:")) {
                        var data = [];
                        var spouse = $(fperson[i]).next("td");
                        i++;
                        if (exists(fperson[i]) && $(fperson[i]).text().toLowerCase().startsWith("marriage")) {
                            data = parseFamilyDate($(fperson[i]).next("td").html());
                        }
                        processFamilySearch(spouse, "spouse", famid, data);
                        myhspouse.push(famid);
                        famid++;
                    } else if (fieldname.startsWith("child")) {
                        processFamilySearch($(fperson[i]).next("td"), "child", famid);
                        famid++;
                    }
                }
            }
        }
 */
    } else if (isParent(relation.title)) {
        /*
        if (parentmarriageid === "") {
            parentmarriageid = relation.itemId;
        } else if (relation.itemId !== parentmarriageid) {
            for (var x = 1; x < ftable.length; x++) {
                var fperson = $(ftable[x]).find(".factLabel");
                for (var i = 0; i < fperson.length; i++) {
                    var row = $(fperson[i]).text();
                    if (exists(row) && row.length > 1) {
                        var fieldname = row.toLowerCase().trim();
                        if (fieldname.startsWith("spouse:")) {
                            var url = $($(fperson[i]).next("td")).find("a").attr("href");
                            if (exists(url)) {
                                url = url.replace("?view=details", "").replace("?view=basic", "");
                                var itemid = url.substring(url.lastIndexOf('/') + 1);
                                if (itemid === parentmarriageid) {
                                    i++;
                                    if (exists(fperson[i]) && $(fperson[i]).text().toLowerCase().startsWith("marriage")) {
                                        profiledata["marriage"] = parseFamilyDate($(fperson[i]).next("td").html());
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        */
    } else if (isChild(relation.title)) {
        /*
        for (var x = 1; x < ftable.length; x++) {
            var fperson = $(ftable[x]).find(".factLabel");
            for (var i = 0; i < fperson.length; i++) {
                var row = $(fperson[i]).text();
                if (exists(row) && row.length > 1) {
                    var fieldname = row.toLowerCase().trim();
                    if (fieldname.startsWith("father:") || fieldname.startsWith("mother:")) {
                        var url = $($(fperson[i]).next("td")).find("a").attr("href");
                        if (exists(url)) {
                            url = url.replace("?view=details", "").replace("?view=basic", "");
                            var itemid = url.substring(url.lastIndexOf('/') + 1);
                            if (focusURLid !== itemid) {
                                childlist[relation.proid] = $.inArray(itemid, unionurls);
                                profiledata["parent_id"] = $.inArray(itemid, unionurls);
                                break;
                            }
                        }
                    }
                }
            }
        }
        */
    } else if (isSibling(relation.title)) {
        /*
        var siblingparents = [];
        for (var x = 1; x < ftable.length; x++) {
            var fperson = $(ftable[x]).find(".factLabel");
            for (var i = 0; i < fperson.length; i++) {
                var row = $(fperson[i]).text();
                if (exists(row) && row.length > 1) {
                    var fieldname = row.toLowerCase().trim();
                    if (fieldname.startsWith("father:") || fieldname.startsWith("mother:")) {
                        var url = $($(fperson[i]).next("td")).find("a").attr("href");
                        if (exists(url)) {
                            url = url.replace("?view=details", "").replace("?view=basic", "");
                            var itemid = url.substring(url.lastIndexOf('/') + 1);
                            siblingparents.push(itemid);
                        }
                    }
                }
            }
        }
        if (siblingparents.length > 0) {
            profiledata["halfsibling"] = !recursiveCompare(parentlist, siblingparents);
        }
        */
    }

    // ---------------------- Profile Data --------------------
    if (focusdaterange !== "") {
        profiledata["daterange"] = focusdaterange;
    }

    if (!burialdtflag && buriallcflag && deathdtflag && $('#burialonoffswitch').prop('checked')) {
        profiledata = checkBurial(profiledata);
    }

    if (aboutdata.trim() !== "") {
        profiledata["about"] = cleanHTML(aboutdata);
        // "\n--------------------\n"  Merge separator
    }

    if (familymembers) {
        alldata["profile"] = profiledata;
        alldata["scorefactors"] = smscorefactors;
        updateGeo();
    }
    return profiledata;
}

function getFSMarriageInfo(fscouple) {
    var data = [];
    var eventval = $(fscouple).find(".marriage-info");
    var dateval = cleanHTML(eventval.find(".marriage-date").attr("data-test-marriage-info-date")).trim();
    if (dateval === "") {
        dateval = cleanHTML(eventval.find(".marriage-date").text()).replace("Marriage:", "").trim();
    }
    dateval = cleanDate(dateval);
    if (dateval !== "") {
        data.push({date: dateval});
    }
    var eventlocation = cleanHTML(eventval.find(".marriage-place").attr("data-test-marriage-info-place")).trim();
    if (eventlocation === "") {
        eventlocation = cleanHTML(eventval.find(".marriage-place").text()).trim();
    }
    if (eventlocation !== "") {
        data.push({id: geoid, location: eventlocation});
        geoid++;
    }
    return data;
}


function parseFamilyDate(vitalstring) {
    var data = [];
    var dmatch = $(vitalstring).find(".datePart");
    if (exists(dmatch) && dmatch.length > 0) {
        var dateval = cleanHTML($(dmatch[0]).text()).trim();
        dateval = cleanDate(dateval);
        if (dateval !== "") {
            data.push({date: dateval});
        }
    }
    dmatch = $(vitalstring).find(".placePart");
    if (exists(dmatch) && dmatch.length > 0) {
        var eventlocation = cleanHTML($(dmatch[0]).text()).trim();
        if (eventlocation !== "") {
            data.push({id: geoid, location: eventlocation});
            geoid++;
        }
    }
    return data;
}

function parseFamilyName(focusperson) {
    if (focusperson.match(/\s\/\w+\//g,'')) {
        focusperson = focusperson.replace(/\//g, "");
    }
    return focusperson;
}

function getFamilySearch(famid, url, subdata) {
    familystatus.push(famid);
    chrome.extension.sendMessage({
        method: "GET",
        action: "xhttp",
        url: url,
        variable: subdata
    }, function (response) {
        var arg = response.variable;

        var source = $.parseHTML(response.source);


        if (arg.itemId === 'LZ1K-7HM') {
            console.log($(source).outerHTML());
        var person = parseFamilySearch(response.source, false, {"title": arg.title, "proid": arg.profile_id, "itemId": arg.itemId, "gender": arg.gender});
        if (person === "") {
            familystatus.pop();
            return;
        }
        person = updateInfoData(person, arg);
        databyid[arg.profile_id] = person;
        alldata["family"][arg.title].push(person);
        familystatus.pop();
        }

    });
}

function processFamilySearch(person, title, famid, data) {
    var personinfo = $(person).find(".fs-person-vitals__name--eurotypic").find("a").attr("data-cmd-data");

    if (exists(personinfo)) {
        personinfo = JSON.parse(personinfo);
        var itemid = personinfo.id;
        if (itemid === focusURLid) {
            return false;
        }
        var url = "https://familysearch.org/tree/#view=ancestor&person=" + itemid;
        var name = personinfo.name;
        var gendersv = "unknown";
        if (exists(personinfo.gender)) {
            gendersv = personinfo.gender.toLowerCase();
        } else if (isFemale(title)) {
            gendersv = "female";
        } else if (isMale(title)) {
            gendersv = "male";
        } else if (isPartner(title)) {
            gendersv = reverseGender(focusgender);
        }
        if (!exists(alldata["family"][title])) {
            alldata["family"][title] = [];
        }
        if (isParent(title)) {
            parentlist.push(itemid);
        }

        var drange = $(person).find(".fs-person-details__lifeSpan").text();
        var person = {name: name, status: title, gender: gendersv, url: url, itemId: itemid, profile_id: famid, title: title};
        if (!$.isEmptyObject(data)) {
             person["marriage"] = data;
        }
        if (exists(drange) && drange !== "") {
            if (drange.contains("-")) {
                var splitr = drange.trim().split("-");
                if (splitr[0] !== "?" && splitr[0] !== "") {
                    person["birthyear"] = splitr[0];
                }
                if (splitr[1] !== "?" && splitr[1] !== "" && splitr[1] !== "Deceased") {
                    person["deathyear"] = splitr[1];
                }
            } else if (!isNaN(drange)) {
                person["birthyear"] = drange.trim();
            } else if (drange === "Living") {
                person["alive"] = true;
            }
        }
        person = updateInfoData(person, person);
        unionurls[famid] = itemid;

        databyid[famid] =  person;
        alldata["family"][title].push(person);
        familystatus.pop();
        console.log(url);
        getFamilySearch(famid, url, person);
        return true;
    }
}